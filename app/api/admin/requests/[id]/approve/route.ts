import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  demoVersion: z.string().min(1).max(64).default("default"),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid demo version name" }, { status: 400 });
  }

  const request = await prisma.demoRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed" }, { status: 409 });
  }

  // Create or upgrade the user account.
  // emailVerified is set so Auth.js doesn't treat their first sign-in as a
  // separate verification step — they're trusted because admin approved them.
  const user = await prisma.user.upsert({
    where: { email: request.email },
    update: {
      name: request.name,
      organisation: request.organisation,
      demoVersion: parsed.data.demoVersion,
      requestType: request.requestType,
      role: "CLIENT",
      emailVerified: new Date(),
    },
    create: {
      email: request.email,
      name: request.name,
      organisation: request.organisation,
      demoVersion: parsed.data.demoVersion,
      requestType: request.requestType,
      role: "CLIENT",
      emailVerified: new Date(),
    },
  });

  // Mark the request approved
  await prisma.demoRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: session.user.email,
      approvedUserId: user.id,
    },
  });

  // ── ONE-CLICK MAGIC LINK ──
  // Trigger Auth.js to generate a real verification token, store it in the DB,
  // and send the magic-link email via the existing Resend provider config in auth.ts.
  // The user clicks the link in the email and lands signed in at /portal — no
  // intermediate sign-in form.
  let emailSent = false;
  try {
    await signIn("resend", {
      email: request.email,
      redirect: false,
      redirectTo: "/portal",
    });
    emailSent = true;
  } catch (err) {
    // signIn() with redirect: false logs errors instead of throwing in some Auth.js
    // versions, but if it does throw we catch here so the admin's approval still
    // succeeds. The user can request a fresh magic link from /auth/signin if needed.
    console.error("Failed to send magic-link email via signIn():", err);
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    emailSent,
    fallbackUrl: emailSent ? null : `${process.env.AUTH_URL || "https://reaction.org.uk"}/auth/signin`,
  });
}
