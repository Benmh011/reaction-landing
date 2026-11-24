// Trades PMS: load and save the signed-in user's database.
//
//   GET  -> the saved database file (204 if this login has never saved)
//   PUT  -> save it, if it is based on the version held here (409 if not)
//
// Headers both ways: x-tpms-version, x-tpms-encoding ("gzip" or "none").

import { NextRequest, NextResponse } from "next/server";
import { MAX_STORE_BYTES, loadStore, looksLikeSqlite, saveStore, tradesPmsGate, type Encoding } from "@/lib/tradesPms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const gate = await tradesPmsGate();
  if (!gate.ok) return new NextResponse(null, { status: gate.status, headers: NO_STORE });

  const stored = await loadStore(gate.userId);
  if (!stored) return new NextResponse(null, { status: 204, headers: NO_STORE });

  return new NextResponse(new Uint8Array(stored.data), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "application/octet-stream",
      "x-tpms-version": String(stored.version),
      "x-tpms-encoding": stored.encoding,
    },
  });
}

export async function PUT(req: NextRequest) {
  const gate = await tradesPmsGate();
  if (!gate.ok) return NextResponse.json({ error: "Not signed in" }, { status: gate.status, headers: NO_STORE });

  const base = Number(req.headers.get("x-tpms-base-version"));
  if (!Number.isInteger(base) || base < 0) {
    return NextResponse.json({ error: "Missing version" }, { status: 400, headers: NO_STORE });
  }
  const encoding: Encoding = req.headers.get("x-tpms-encoding") === "gzip" ? "gzip" : "none";

  if (Number(req.headers.get("content-length") ?? 0) > MAX_STORE_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413, headers: NO_STORE });
  }
  const data = Buffer.from(await req.arrayBuffer());
  if (data.length > MAX_STORE_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413, headers: NO_STORE });
  }
  if (!looksLikeSqlite(data, encoding)) {
    return NextResponse.json({ error: "Not a database file" }, { status: 400, headers: NO_STORE });
  }

  const version = await saveStore(gate.userId, base, data, encoding);
  if (version === null) {
    return NextResponse.json({ error: "Changed somewhere else" }, { status: 409, headers: NO_STORE });
  }
  return NextResponse.json({ version }, { headers: NO_STORE });
}
