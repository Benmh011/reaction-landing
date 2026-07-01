import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// First-party analytics ingestion. Called by components/SiteAnalytics.tsx via
// fetch() and navigator.sendBeacon(). Intentionally public (no session), but
// same-origin only, size-limited, and fail-soft — it must never surface an
// error to the visitor or affect page behaviour.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["pageview", "demo"]),
  sessionId: z.string().min(8).max(64),
  path: z.string().max(512).optional(),
  slug: z.string().max(128).optional(),
  referrer: z.string().max(512).optional(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
  durationMs: z.number().int().min(0).max(1000 * 60 * 60 * 6).optional(),
});

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true; // sendBeacon sometimes omits origin; allow
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Always 204 — we never want the client to retry or see an error.
  const ok = new NextResponse(null, { status: 204 });
  try {
    if (!sameOrigin(req)) return ok;

    const raw = await req.text();
    if (!raw || raw.length > 4000) return ok;

    const parsed = bodySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return ok;
    const d = parsed.data;

    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;

    if (d.type === "pageview" && d.path) {
      await prisma.pageView.create({
        data: {
          path: d.path.slice(0, 512),
          referrer: d.referrer?.slice(0, 512) || null,
          sessionId: d.sessionId,
          device: d.device ?? null,
          country,
        },
      });
    } else if (d.type === "demo" && d.slug) {
      await prisma.demoSession.create({
        data: {
          slug: d.slug.slice(0, 128),
          sessionId: d.sessionId,
          durationMs: d.durationMs ?? 0,
        },
      });
    }
  } catch {
    // swallow — analytics must never break navigation
  }
  return ok;
}
