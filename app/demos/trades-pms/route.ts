// Trades PMS: the page itself.
//
// This is a route handler rather than a React page because the app is the
// desktop build's own HTML and scripts (the /trades-pms folder), served as
// they are. This handler only decides who gets it.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { TRADES_PMS_URL, tradesPmsGate } from "@/lib/tradesPms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The desktop build's own policy, widened only for what the web needs:
// WebAssembly (SQLite), saving to this site, and the postcode lookup that the
// desktop build makes from its main process.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.postcodes.io",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function notOnAccount(email: string) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Trades PMS</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#e9e2d0;color:#1c1a15;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  div{max-width:420px}
  small{display:block;font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;color:#6d6759;margin-bottom:10px}
  h1{font-size:34px;line-height:1.08;margin:0 0 10px;font-weight:700;letter-spacing:-.01em}
  p{font-size:14.5px;line-height:1.5;color:#6d6759;margin:0 0 24px}
  a{display:inline-block;padding:11px 18px;border-radius:999px;background:#d8432b;color:#fff;text-decoration:none;font-weight:600;font-size:14.5px}
</style></head>
<body><div>
  <small>REACTION · DEMONSTRATION</small>
  <h1>This demo isn't on your account yet.</h1>
  <p>You're signed in as ${esc(email)}, but Trades PMS hasn't been added to this account. Request access and we'll switch it on for you.</p>
  <a href="/demo">Request access</a>
</div></body></html>`;
}

export async function GET(req: Request) {
  const gate = await tradesPmsGate();

  if (!gate.ok && gate.status === 401) {
    const to = new URL(`/auth/signin?callbackUrl=${encodeURIComponent(TRADES_PMS_URL)}`, req.url);
    return NextResponse.redirect(to, { status: 307, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!gate.ok) {
    return new NextResponse(notOnAccount(gate.email), { status: 403, headers: HEADERS });
  }

  const html = await readFile(path.join(process.cwd(), "trades-pms", "web", "index.html"), "utf8");
  // The site's own counter is not on this page, so the time spent here is sent
  // by a small script of this site's (public/demo-timer.js; allowed by the
  // policy above as a script of our own). The app's files are not touched.
  const timed = html.replace("</body>", `<script src="/demo-timer.js" data-slug="trades-pms" defer></script>\n</body>`);
  return new NextResponse(timed, { status: 200, headers: { ...HEADERS, "Content-Security-Policy": CSP } });
}
