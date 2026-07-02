import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

/**
 * Public account creation. Passwordless by design: we create the User record
 * (if new) and send a magic sign-in link via the existing Resend provider —
 * the same mechanism the whole site's auth already uses. If the email already
 * has an account, the link simply signs them in; the response is identical
 * either way so the endpoint never leaks which addresses exist.
 */

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().max(200),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid name and email." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name?.trim() || null;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: { email, name, role: "CLIENT", requestType: "BUSINESS" },
      });
    } else if (name && !existing.name) {
      await prisma.user.update({ where: { id: existing.id }, data: { name } });
    }
  } catch (err) {
    console.error("register: user upsert failed", err);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }

  try {
    await signIn("resend", { email, redirect: false, redirectTo: "/demo" });
  } catch (err) {
    // Auth.js occasionally throws on redirect:false; the token may still send.
    console.error("register: magic link send", err);
  }

  return NextResponse.json({ ok: true });
}
