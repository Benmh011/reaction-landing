import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/vet/db";

export const runtime = "nodejs";

// POST /api/feedback  { logId, rating (1-10), comment? }
export async function POST(req: NextRequest) {
  const { logId, rating, comment } = await req.json();
  if (!logId || typeof rating !== "number" || rating < 1 || rating > 10) {
    return NextResponse.json({ error: "logId and rating (1-10) required" }, { status: 400 });
  }
  try {
    await prisma.queryLog.update({
      where: { id: String(logId) },
      data: { rating, feedback: comment ? String(comment).slice(0, 4000) : null },
    });
  } catch {
    return NextResponse.json({ error: "log not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
