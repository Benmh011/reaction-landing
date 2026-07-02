import { NextRequest, NextResponse } from "next/server";
import { articledGate } from "@/lib/articled/gate";
import { DASHBOARD_HTML_B64 } from "./html";

export const runtime = "nodejs";

// Serves Articled's practice-management demo dashboard, gated by reaction's session
// so it sits behind the same Launch-demo login as the rest of the app. All data shown
// is fictional and lives in the visitor's browser, not the database.
export async function GET(req: NextRequest) {
  const user = await articledGate();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/articled", req.url));
  }
  const html = Buffer.from(DASHBOARD_HTML_B64, "base64").toString("utf-8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
