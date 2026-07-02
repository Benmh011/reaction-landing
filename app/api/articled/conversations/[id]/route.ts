import { NextRequest, NextResponse } from "next/server";
import { articledGate } from "@/lib/articled/gate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


async function gate(): Promise<string | null> {
  return await articledGate();
}

// "frs-23" -> { kind: "frs", ref: "23" }
// "hmrc:paye-manual-PAYE14020" -> { kind: "hmrc", ref: "PAYE14020", url: gov.uk link }
function parseRef(ref: string) {
  if (ref.startsWith("hmrc:")) {
    const rest = ref.slice(5);
    const i = rest.lastIndexOf("-");
    const slug = rest.slice(0, i);
    const r = rest.slice(i + 1);
    return { kind: "hmrc", ref: r, title: r, url: `https://www.gov.uk/hmrc-internal-manuals/${slug}/${r.toLowerCase()}` };
  }
  const i = ref.indexOf("-");
  const kind = i >= 0 ? ref.slice(0, i) : ref;
  const r = i >= 0 ? ref.slice(i + 1) : "";
  return { kind, ref: r, title: r };
}

// Load the messages for one conversation (verifying it belongs to the user).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await gate();
  if (!email) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  const { id } = await params;

  const conv = await prisma.articledConversation.findFirst({ where: { id, userId: email } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conversationId = `web:${email}:${id}`;
  const rows = await prisma.articledAuditTurn.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  // Stored files for this conversation, grouped by the turn they belong to.
  const files = await prisma.articledChatFile.findMany({
    where: { conversationId },
    select: { id: true, auditTurnId: true, filename: true, kind: true },
  });
  const filesByTurn = new Map<string, typeof files>();
  for (const f of files) {
    if (!f.auditTurnId) continue;
    const list = filesByTurn.get(f.auditTurnId) ?? [];
    list.push(f);
    filesByTurn.set(f.auditTurnId, list);
  }

  const messages: unknown[] = [];
  for (const row of rows) {
    messages.push({ role: "user", text: row.question });
    const result = (filesByTurn.get(row.id) ?? []).find((f) => f.kind === "result");
    messages.push({
      role: "assistant",
      text: row.answer,
      sources: (row.sourceRefs ?? []).map(parseRef),
      ...(result ? { download: { url: `/api/files/${result.id}`, filename: result.filename } } : {}),
    });
  }
  return NextResponse.json({ id, title: conv.title, messages });
}

// Delete a conversation and its turns.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await gate();
  if (!email) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  const { id } = await params;

  const conv = await prisma.articledConversation.findFirst({ where: { id, userId: email } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.articledChatFile.deleteMany({ where: { conversationId: `web:${email}:${id}` } });
  await prisma.articledAuditTurn.deleteMany({ where: { conversationId: `web:${email}:${id}` } });
  await prisma.articledConversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
