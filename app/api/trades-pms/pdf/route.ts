// Trades PMS: turn a document into a PDF.
//
// The desktop build prints its documents with Electron's Chromium
// (src/main.js, printToPDF). This does the same job with the same engine and
// the same settings: A4, backgrounds on, the same margins, "Page x of y" in
// the footer, scripts off. The page sends the finished HTML (built in the
// browser by src/docs.js); the PDF comes back as a download. Nothing is kept.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { tradesPmsGate } from "@/lib/tradesPms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HTML_BYTES = 3 * 1024 * 1024; // room for a logo and signatures
const FONT_DIR = path.join(process.cwd(), "trades-pms", "src", "assets", "fonts");

// Exactly the footer in src/main.js.
const FOOTER =
  '<div style="font-size:7px;width:100%;padding:0 0.5in;color:#5A6774;font-family:sans-serif;text-align:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';

// docs.js points its @font-face rules at the app's font files. The print
// browser is cut off from the network, so the fonts are put into the document.
async function inlineFonts(html: string): Promise<string> {
  const names = new Set<string>();
  const pattern = /url\((['"]?)[^'")]*\/assets\/fonts\/([A-Za-z0-9-]+\.woff2)\1\)/g;
  for (const m of html.matchAll(pattern)) names.add(m[2]);
  const data = new Map<string, string>();
  for (const name of names) {
    try {
      data.set(name, (await readFile(path.join(FONT_DIR, name))).toString("base64"));
    } catch {
      /* not one of ours: left as it is, and blocked below */
    }
  }
  return html.replace(pattern, (whole, _q, name: string) =>
    data.has(name) ? `url('data:font/woff2;base64,${data.get(name)}')` : whole,
  );
}

// A file name that is safe in a header, keeping the app's own naming.
function cleanName(name: unknown): string {
  const s = String(name ?? "").replace(/[^A-Za-z0-9 ._()-]/g, "").trim().slice(0, 120);
  return /\.pdf$/i.test(s) ? s : "document.pdf";
}

export async function POST(req: NextRequest) {
  const gate = await tradesPmsGate();
  if (!gate.ok) return NextResponse.json({ error: "Not signed in" }, { status: gate.status });

  let html = "";
  let filename = "document.pdf";
  try {
    const text = await req.text();
    if (Buffer.byteLength(text) > MAX_HTML_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
    const body = JSON.parse(text);
    html = typeof body.html === "string" ? body.html : "";
    filename = cleanName(body.filename);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!html) return NextResponse.json({ error: "Nothing to print" }, { status: 400 });

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    // CHROMIUM_PATH lets a developer's own machine use an installed Chrome or
    // Edge (the bundled build only runs on the server). Not set on Vercel.
    const local = process.env.CHROMIUM_PATH;
    browser = await puppeteer.launch({
      args: local ? ["--no-sandbox"] : puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: local || (await chromium.executablePath()),
      headless: local ? true : "shell",
    });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    // The document may only use what is inside it: no address is ever fetched.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const url = r.url();
      if (url.startsWith("data:") || url === "about:blank") r.continue();
      else r.abort();
    });
    await page.setContent(await inlineFonts(html), { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0.45in", bottom: "0.6in", left: "0.5in", right: "0.5in" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: FOOTER,
      timeout: 30000,
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("trades-pms pdf failed:", e);
    return NextResponse.json({ error: "The PDF could not be made." }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
