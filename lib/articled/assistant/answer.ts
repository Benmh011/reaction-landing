// Shared "answer a question" pipeline: retrieve grounding -> ask Claude -> audit log.
// Used by both the web route and the Teams bot so the two front doors behave identically.
// Now conversation-aware: the bot passes prior turns as `history` so follow-ups work.

import { retrieve } from "@/lib/articled/rag/retrieve";
import { converse, type BedrockMessage, type ContentBlock } from "@/lib/articled/llm/bedrock";
import { SYSTEM_PROMPT } from "@/lib/articled/llm/systemPrompt";
import { prisma } from "@/lib/prisma";

export type AnswerResult = {
  answer: string;
  sources: { kind: string; ref: string; title: string; url?: string }[];
  latencyMs: number;
};

// Pull the most recent user message text out of the history, so we can fold it into
// the retrieval query — otherwise a follow-up like "what about leased ones?" retrieves
// nothing useful on its own.
function lastUserText(history: BedrockMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    const t = m.content.find((c) => "text" in c) as { text: string } | undefined;
    if (t?.text) return t.text;
  }
  return "";
}

// Load the last `limit` turns for a Teams conversation, oldest-first, as Bedrock
// messages. Each stored turn becomes a user message + an assistant message.
export async function loadHistory(
  conversationId: string | null | undefined,
  limit = 6,
): Promise<BedrockMessage[]> {
  if (!conversationId) return [];
  const rows = await prisma.articledAuditTurn.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  rows.reverse(); // back to chronological order
  const messages: BedrockMessage[] = [];
  for (const r of rows) {
    messages.push({ role: "user", content: [{ text: r.question || "…" }] });
    messages.push({ role: "assistant", content: [{ text: r.answer || "…" }] });
  }
  return messages;
}

// Route the question: direct factual lookups go to the cheaper, faster Haiku model;
// anything needing judgement or multi-step reasoning goes to Sonnet. This runs in
// parallel with retrieval, so it adds no perceptible latency, and it fails safe to
// Sonnet if the fast model isn't configured or the classifier errors.
async function pickModel(text: string, hasAttachments: boolean): Promise<string> {
  const sonnet = process.env.BEDROCK_MODEL_ID!;
  const haiku = process.env.BEDROCK_MODEL_ID_FAST;
  // No fast model configured, or a file/screenshot to reason over -> use Sonnet.
  if (!haiku || hasAttachments || !text.trim()) return sonnet;
  try {
    const { text: label } = await converse({
      modelId: haiku,
      system:
        "You route questions for a UK accountancy assistant. Reply with ONE word only. " +
        "LOOKUP = a direct factual question answerable by stating a rate, a definition, or a single standard/section. " +
        "REASONING = needs judgement, multiple steps, comparing scenarios, interpreting how rules interact, or working through a specific client situation. " +
        "When unsure, answer REASONING.",
      messages: [{ role: "user", content: [{ text }] }],
      maxTokens: 4,
      temperature: 0,
    });
    return /lookup/i.test(label) ? haiku : sonnet;
  } catch {
    return sonnet; // fail safe to the stronger model
  }
}

export async function answerQuestion(opts: {
  question: string;
  history?: BedrockMessage[]; // prior turns, already in Bedrock format
  userId?: string | null; // Teams/Entra id in Phase 2; null for web tests
  conversationId?: string | null; // Teams conversation id, for memory + audit
  attachments?: ContentBlock[]; // image/document blocks from a dropped file or screenshot
  preferModel?: string; // explicit model id (e.g. Opus) — skips the auto Haiku/Sonnet router
}): Promise<AnswerResult> {
  const question = opts.question.trim();
  const history = opts.history ?? [];
  const attachments = opts.attachments ?? [];
  const startedAt = Date.now();

  // 1. Retrieve grounding and pick the model in parallel. Fold in the previous user
  //    turn so follow-ups resolve.
  const prior = lastUserText(history);
  const retrievalQuery = question
    ? prior
      ? `${prior}\n${question}`
      : question
    : "";
  const [sources, modelId] = await Promise.all([
    retrievalQuery ? retrieve(retrievalQuery) : Promise.resolve([] as Awaited<ReturnType<typeof retrieve>>),
    opts.preferModel
      ? Promise.resolve(opts.preferModel)
      : pickModel(retrievalQuery || question, attachments.length > 0),
  ]);

  const context = sources
    .map((s) => {
      if (s.kind === "frs") {
        return `[FRS 102 §${s.ref}]\n${s.content}`;
      }
      if (s.kind === "hmrc") {
        // Rebuild the live gov.uk link from the manual slug (category) + section code.
        const url = s.category
          ? `https://www.gov.uk/hmrc-internal-manuals/${s.category}/${s.ref.toLowerCase()}`
          : "";
        const link = url ? ` (${url})` : "";
        return `[HMRC ${s.ref} — ${s.title}${link}]\n${s.content}`;
      }
      return `[Firm template — ${s.title}]\n${s.content}`;
    })
    .join("\n\n---\n\n");

  // 2. Ask Claude. History first, then this turn (attachments before the grounded text).
  const userContent: ContentBlock[] = [
    ...attachments,
    {
      text: `<retrieved_context>\n${
        context || "(no relevant material found)"
      }\n</retrieved_context>\n\n${question}`,
    },
  ];

  const messages: BedrockMessage[] = [...history, { role: "user", content: userContent }];

  const { text } = await converse({ system: SYSTEM_PROMPT, messages, modelId });
  const latencyMs = Date.now() - startedAt;

  // 3. Persist the turn. This doubles as the conversation memory AND the web message
  //    store, so we MUST await it: on serverless, a fire-and-forget write can be dropped
  //    when the function suspends right after responding — which is why some prompts and
  //    answers weren't being saved. We still swallow errors so a logging hiccup never
  //    loses the answer for the user.
  try {
    await prisma.articledAuditTurn.create({
      data: {
        userId: opts.userId ?? null,
        conversationId: opts.conversationId ?? null,
        question: question || (attachments.length ? "[attachment only]" : ""),
        answer: text,
        sourceRefs: sources.map((s) =>
          s.kind === "hmrc" && s.category ? `hmrc:${s.category}-${s.ref}` : `${s.kind}-${s.ref}`
        ),
        model: modelId,
        latencyMs,
      },
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }

  return {
    answer: text,
    sources: sources.map((s) => ({
      kind: s.kind,
      ref: s.ref,
      title: s.title,
      // HMRC chunks link to the live gov.uk manual page; FRS/firm have no public URL.
      url:
        s.kind === "hmrc" && s.category
          ? `https://www.gov.uk/hmrc-internal-manuals/${s.category}/${s.ref.toLowerCase()}`
          : undefined,
    })),
    latencyMs,
  };
}
