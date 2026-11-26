import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { RANGES, siteFigures, type RangeDays } from "@/lib/siteFigures";

// The site's figures as totals, for Reaction's own PMS to fetch.
//
//   GET /api/analytics/summary?days=7|30|90|365
//   Authorization: Bearer <ANALYTICS_KEY>
//
// Read only: nothing here writes. It answers only to the key set in Vercel as
// ANALYTICS_KEY (made in the PMS under Settings, Company, Website). Until that
// is set this address does not exist: it answers 404, as any unknown page.
// The answer is never cached and is told to search engines to stay out.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const digest = (v: string) => createHash("sha256").update(v).digest();

export async function GET(req: Request) {
  const key = process.env.ANALYTICS_KEY ?? "";
  if (key.length < 32) return new NextResponse(null, { status: 404, headers: HEADERS });

  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // Compared as digests, so the time taken says nothing about how much of the key was right.
  if (!given || !timingSafeEqual(digest(given), digest(key))) {
    return NextResponse.json({ error: "That key is not the one this site holds." }, { status: 401, headers: HEADERS });
  }

  const asked = Number(new URL(req.url).searchParams.get("days") ?? 30);
  if (!RANGES.includes(asked as RangeDays)) {
    return NextResponse.json({ error: `days must be one of ${RANGES.join(", ")}.` }, { status: 400, headers: HEADERS });
  }

  try {
    const figures = await siteFigures(asked as RangeDays, req.headers.get("host"));
    return NextResponse.json({ site: req.headers.get("host") ?? "", ...figures }, { headers: HEADERS });
  } catch (e) {
    console.error("[analytics/summary]", e);
    return NextResponse.json({ error: "The figures could not be read just now." }, { status: 500, headers: HEADERS });
  }
}
