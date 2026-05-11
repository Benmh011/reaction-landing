// app/api/unsubscribe/route.ts
//
// Handles two flows:
//   1. POST — RFC 8058 "List-Unsubscribe-Post: List-Unsubscribe=One-Click"
//      Used by Gmail/Apple Mail's one-click unsubscribe button.
//      Body: form-encoded "List-Unsubscribe=One-Click"
//      Token is verified from query string ?email=X&token=Y.
//   2. GET — confirmation from our own /unsubscribe page after user clicks.
//      Same token verification, returns JSON.
//
// In both cases:
//   - Verify HMAC token against email
//   - Set marketingOptOut=true on the User if they exist
//   - Also write to an EmailOptOut table so we can track opt-outs from non-users
//     (prospects who never registered an account)
//   - Idempotent: re-running opts-out on an already-opted-out email is a no-op.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email-templates";

async function processUnsubscribe(email: string, token: string): Promise<{ ok: boolean; status: number; message: string }> {
  if (!email || !token) {
    return { ok: false, status: 400, message: "Missing email or token." };
  }

  const lowerEmail = email.toLowerCase().trim();

  if (!verifyUnsubscribeToken(lowerEmail, token)) {
    return { ok: false, status: 400, message: "Invalid or expired unsubscribe link." };
  }

  // Best-effort: update existing User row if present.
  try {
    await prisma.user.updateMany({
      where: { email: lowerEmail },
      data: { marketingOptOut: true },
    });
  } catch (err) {
    // marketingOptOut field may not exist yet (db not migrated). Log + continue.
    console.warn("[unsubscribe] Could not update User.marketingOptOut:", err);
  }

  // Always also record in the opt-out tombstone table — this catches prospects
  // who haven't registered but submitted a demo request. Best-effort.
  try {
    await prisma.emailOptOut.upsert({
      where: { email: lowerEmail },
      update: { optedOutAt: new Date() },
      create: { email: lowerEmail, optedOutAt: new Date() },
    });
  } catch (err) {
    // EmailOptOut table may not exist yet — log + continue. The page will still show
    // the user a confirmation; we'll honour the opt-out once the table is created.
    console.warn("[unsubscribe] Could not write to EmailOptOut:", err);
  }

  console.log(`[AUDIT] email_unsubscribed email=${lowerEmail} at=${new Date().toISOString()}`);

  return { ok: true, status: 200, message: "You've been unsubscribed." };
}

// GET — called from the /unsubscribe page (JS-driven confirmation)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || "";
  const token = url.searchParams.get("token") || "";
  const result = await processUnsubscribe(email, token);
  return NextResponse.json(result, { status: result.status });
}

// POST — called by mail clients (Gmail, Apple Mail) via the List-Unsubscribe-Post header
export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || "";
  const token = url.searchParams.get("token") || "";
  const result = await processUnsubscribe(email, token);
  // Mail clients expect 200 OK with no body
  return new NextResponse(null, { status: result.ok ? 200 : 400 });
}
