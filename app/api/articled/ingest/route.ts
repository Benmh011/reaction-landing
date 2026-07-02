import { NextRequest, NextResponse } from "next/server";
import { ingestAll } from "@/lib/articled/rag/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

// Setup/maintenance endpoint, locked behind a secret so the public can't trigger
// (and pay for) re-embedding. Set INGEST_SECRET in your env, then re-seed with:
//   https://<your-app>.vercel.app/api/ingest?key=YOUR_SECRET
async function run(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const provided =
    req.nextUrl.searchParams.get("key") ?? req.headers.get("x-ingest-key") ?? "";

  // Fail closed: if no secret is configured, or it doesn't match, deny.
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await ingestAll();
    return NextResponse.json({ ok: true, ingested: count });
  } catch (e) {
    console.error("ingest failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
