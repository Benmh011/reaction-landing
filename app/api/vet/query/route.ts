import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/vet/agent";
import { prisma } from "@/lib/vet/db";
import type { Site } from "@prisma-vet/client";

// POST /api/query  { question, site, userId? }
// In production, derive `site` and `userId` from the authenticated session
// (Auth.js) rather than the request body, and gate by Role.
export async function POST(req: NextRequest) {
  const { question, site, userId } = await req.json();
  if (!question || !site) {
    return NextResponse.json({ error: "question and site required" }, { status: 400 });
  }

  const result = await runAgent(question, { site: site as Site });

  const log = await prisma.queryLog.create({
    data: {
      userId: userId ?? null,
      site: site as Site,
      question,
      answer: result.answer,
      toolCalls: result.toolCalls as any,
      sourcesUsed: result.sourcesUsed as any,
    },
  });

  return NextResponse.json({
    answer: result.answer,
    toolCalls: result.toolCalls,
    logId: log.id,
  });
}
