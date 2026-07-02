import { NextResponse } from "next/server";
import { articledGate } from "@/lib/articled/gate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


async function gate(): Promise<string | null> {
  return await articledGate();
}

// List the user's conversations, most recently used first.
export async function GET() {
  const email = await gate();
  if (!email) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const conversations = await prisma.articledConversation.findMany({
    where: { userId: email },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ conversations });
}

// Start a new conversation.
export async function POST() {
  const email = await gate();
  if (!email) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const c = await prisma.articledConversation.create({ data: { userId: email } });
  return NextResponse.json({ id: c.id, title: c.title, updatedAt: c.updatedAt });
}
