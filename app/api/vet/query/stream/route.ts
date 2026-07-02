import { NextRequest } from "next/server";
import { runAgentStream } from "@/lib/vet/agent";
import { prisma } from "@/lib/vet/db";
import type { Site } from "@prisma-vet/client";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/query/stream  { question, site, userId? }
// Streams newline-delimited JSON events:
//   {type:"status",tool}  {type:"delta",text}  {type:"reset"}
//   {type:"done",toolCalls,logId}  {type:"error",message}
export async function POST(req: NextRequest) {
  const { question, site, userId } = await req.json();
  if (!question || !site) {
    return new Response(JSON.stringify({ error: "question and site required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* controller already closed */
        }
      };
      try {
        const result = await runAgentStream(question, { site: site as Site }, (ev) => send(ev));

        let logId: string | null = null;
        try {
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
          logId = log.id;
        } catch {
          /* logging is best-effort */
        }

        send({ type: "done", toolCalls: result.toolCalls, logId });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Something went wrong." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
