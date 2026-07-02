import { NextRequest, NextResponse } from "next/server";
import { answerQuestion, loadHistory } from "@/lib/articled/assistant/answer";
import { buildWebAttachments } from "@/lib/articled/assistant/webAttachments";
import { articledGate, ARTICLED_DEMO_USER } from "@/lib/articled/gate";
import { prisma } from "@/lib/prisma";
import type { ContentBlock } from "@/lib/articled/llm/bedrock";

export const runtime = "nodejs"; // AWS SDK needs the Node runtime, not Edge

// Deep-reasoning (Opus) tier is open to all demo users.
function canUseDeep(_user: string): boolean {
  return true;
}

export async function POST(req: NextRequest) {
  // Gate: must be a signed-in reaction user — no anonymous traffic reaches Bedrock.
  const user = await articledGate();
  if (!user) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  // Accept either JSON (text only) or multipart/form-data (text + uploaded files).
  let question = "";
  let threadId = "";
  let attachments: ContentBlock[] = [];
  let deep = false;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      question = ((form.get("question") as string) ?? "").trim();
      threadId = (form.get("conversationId") as string) ?? "";
      deep = form.get("deep") === "true";
      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      attachments = await buildWebAttachments(files);
    } else {
      const body = (await req.json()) as { question?: string; conversationId?: string; deep?: boolean };
      question = body.question?.trim() ?? "";
      threadId = body.conversationId ?? "";
      deep = body.deep === true;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!question && attachments.length === 0) {
    return NextResponse.json({ error: "Missing 'question' or attachment" }, { status: 400 });
  }
  if (!threadId) return NextResponse.json({ error: "Missing 'conversationId'" }, { status: 400 });

  // The thread must belong to this user.
  const conv = await prisma.articledConversation.findFirst({ where: { id: threadId, userId: user } });
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  // Memory is scoped per user AND per thread.
  const conversationId = `web:${user}:${threadId}`;
  const history = await loadHistory(conversationId);

  // Opt-in deep-reasoning tier: only when requested, the user is allowed, and Opus is configured.
  const preferModel =
    deep && canUseDeep(user) && process.env.BEDROCK_MODEL_ID_OPUS
      ? process.env.BEDROCK_MODEL_ID_OPUS
      : undefined;

  const result = await answerQuestion({ question, userId: user, conversationId, history, attachments, preferModel });

  // Title the thread from its first message, and bump it to the top of the list.
  const firstTitle = question ? question.slice(0, 60) : "Document review";
  await prisma.articledConversation.update({
    where: { id: threadId },
    data: {
      updatedAt: new Date(),
      ...(conv.title ? {} : { title: firstTitle }),
    },
  });

  return NextResponse.json(result);
}
