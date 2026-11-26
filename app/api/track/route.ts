import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// First-party analytics ingestion. Called by components/SiteAnalytics.tsx,
// app/demo/LaunchDemoCard.tsx and public/demo-timer.js via fetch() and
// navigator.sendBeacon(). Intentionally public (no session), but same-origin
// only, size-limited, and fail-soft — it must never surface an error to the
// visitor or affect page behaviour.
//
// Three things arrive here: a page view, time spent in a demo, and a button
// or contact link pressed. A signed-in admin is never counted, so our own
// visits do not pad the figures.
//
// The mailing tag on a page view and the SiteEvent table come from
// db/analytics-2.sql. Until that has been run, a tagged page view is stored
// without its tag and a button press is dropped; nothing else changes.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["pageview", "demo", "event"]),
  sessionId: z.string().min(8).max(64),
  path: z.string().max(512).optional(),
  slug: z.string().max(128).optional(),
  referrer: z.string().max(512).optional(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
  durationMs: z.number().int().min(0).max(1000 * 60 * 60 * 6).optional(),
  campaign: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  name: z.string().min(1).max(80).optional(),
  target: z.string().max(200).optional(),
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

    // Our own visits are not the public's. (The session is a signed token, so this asks the database nothing.)
    const session = await auth().catch(() => null);
    if (session?.user?.role === "ADMIN") return ok;

    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;

    if (d.type === "pageview" && d.path) {
      const path = d.path.slice(0, 512);
      const referrer = d.referrer?.slice(0, 512) || null;
      const device = d.device ?? null;
      let stored = false;
      if (d.campaign) {
        try {
          // The time is written as UTC, as the rows Prisma writes are, whatever zone the database session is in.
          await prisma.$executeRaw`INSERT INTO "PageView" ("id","createdAt","path","referrer","sessionId","device","country","campaign")
                                   VALUES (${randomUUID()}, now() AT TIME ZONE 'UTC', ${path}, ${referrer}, ${d.sessionId}, ${device}, ${country}, ${d.campaign})`;
          stored = true;
        } catch {
          // The campaign column is not there yet: keep the page view, without its tag.
        }
      }
      if (!stored) {
        await prisma.pageView.create({ data: { path, referrer, sessionId: d.sessionId, device, country } });
      }
    } else if (d.type === "demo" && d.slug) {
      await prisma.demoSession.create({
        data: {
          slug: d.slug.slice(0, 128),
          sessionId: d.sessionId,
          durationMs: d.durationMs ?? 0,
        },
      });
    } else if (d.type === "event" && d.name) {
      await prisma.$executeRaw`INSERT INTO "SiteEvent" ("id","createdAt","name","target","path","sessionId")
                               VALUES (${randomUUID()}, now() AT TIME ZONE 'UTC', ${d.name.slice(0, 80)}, ${d.target?.slice(0, 200) || null}, ${d.path?.slice(0, 512) || null}, ${d.sessionId})`;
    }
  } catch {
    // swallow — analytics must never break navigation
  }
  return ok;
}
