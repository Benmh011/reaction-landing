// Trades PMS: the app's own files (scripts, styles, fonts, SQLite), straight
// from the /trades-pms folder, to signed-in and approved users only.
//
// The browser asks for /demos/trades-pms/app/<file>; next.config.js rewrites
// that to this route. Nothing is copied into /public, so
// the source is not readable without an approved sign-in.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { tradesPmsGate } from "@/lib/tradesPms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.join(process.cwd(), "trades-pms");

// Only what the browser needs. The Electron-only files (main.js, preload.js),
// the tests and the package files are never served.
const ALLOWED = [/^src\/renderer\//, /^src\/shared\//, /^src\/assets\//, /^src\/(db|rules|docs)\.js$/, /^web\//];

const TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

// Which file is being asked for. After the rewrite the route can be shown
// either address depending on where it runs: the one the browser asked for
// (/demos/trades-pms/app/<file>) or the rewritten one (?f=<file>). Both are read.
const PUBLIC_PREFIX = "/demos/trades-pms/app/";
function requestedFile(req: NextRequest): string {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith(PUBLIC_PREFIX)) {
    try {
      return decodeURIComponent(pathname.slice(PUBLIC_PREFIX.length));
    } catch {
      return "";
    }
  }
  return req.nextUrl.searchParams.get("f") ?? "";
}

export async function GET(req: NextRequest) {
  const gate = await tradesPmsGate();
  if (!gate.ok) return new NextResponse(null, { status: gate.status });

  const f = requestedFile(req);
  const type = TYPES[path.posix.extname(f).toLowerCase()];
  const safe =
    /^[A-Za-z0-9._\/-]+$/.test(f) &&
    !f.split("/").some((part) => part === "" || part === "." || part === "..") &&
    ALLOWED.some((re) => re.test(f));
  if (!safe || !type) return new NextResponse(null, { status: 404 });

  const file = path.join(ROOT, ...f.split("/"));
  if (!file.startsWith(ROOT + path.sep)) return new NextResponse(null, { status: 404 });

  let body: Buffer;
  try {
    body = await readFile(file);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  // "no-cache" means the browser keeps a copy but checks it on every load, so
  // a new deploy is picked up at once and old and new files are never mixed.
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  const headers = {
    ETag: etag,
    "Cache-Control": "private, no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });

  return new NextResponse(new Uint8Array(body), { status: 200, headers: { ...headers, "Content-Type": type } });
}
