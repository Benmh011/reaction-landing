import { NextRequest, NextResponse } from "next/server";
import { articledGate } from "@/lib/articled/gate";
import { prisma } from "@/lib/prisma";
import { processWorksheet } from "@/lib/articled/assistant/worksheet";

export const runtime = "nodejs";


export async function POST(req: NextRequest) {
  const email = await articledGate();
  if (!email) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let instruction = "";
  let threadId = "";
  let file: File | null = null;
  try {
    const form = await req.formData();
    instruction = ((form.get("instruction") as string) ?? "").trim();
    threadId = (form.get("conversationId") as string) ?? "";
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ error: "Only .xlsx files are supported for now" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let result;
  try {
    result = await processWorksheet({ buffer, filename: file.name, instruction });
  } catch (e) {
    console.error("worksheet failed:", e);
    return NextResponse.json({ error: "Couldn't process that spreadsheet." }, { status: 500 });
  }

  // Log the turn and persist the completed file (in our own DB), linked to that turn,
  // so it stays in the chat and can be re-downloaded later.
  let fileId: string | null = null;
  if (threadId) {
    const conv = await prisma.articledConversation.findFirst({ where: { id: threadId, userId: email } });
    if (conv) {
      const label = instruction || `Work on ${file.name}`;
      const conversationId = `web:${email}:${threadId}`;
      try {
        const turn = await prisma.articledAuditTurn.create({
          data: {
            userId: email,
            conversationId,
            question: label,
            answer: result.summary,
            sourceRefs: [],
            model: process.env.BEDROCK_MODEL_ID ?? "unknown",
            latencyMs: 0,
          },
        });
        const stored = await prisma.articledChatFile.create({
          data: {
            auditTurnId: turn.id,
            conversationId,
            userId: email,
            filename: result.filename,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            kind: "result",
            data: result.fileBuffer,
          },
          select: { id: true },
        });
        fileId = stored.id;
      } catch (e) {
        console.error("turn/file persist failed:", e);
      }
      await prisma.articledConversation.update({
        where: { id: threadId },
        data: { updatedAt: new Date(), ...(conv.title ? {} : { title: label.slice(0, 60) }) },
      });
    }
  }

  // Persistent link if stored; base64 fallback otherwise (e.g. no thread).
  return NextResponse.json({
    summary: result.summary,
    edits: result.edits,
    filename: result.filename,
    fileId,
    ...(fileId ? {} : { fileBase64: result.fileBuffer.toString("base64") }),
  });
}
