import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const schema = z.object({
  demoVersion: z.string().min(1).max(64).default("default"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  // Create or upgrade the user account
  const user = await prisma.user.upsert({
    where: { email: request.email },
    update: {
      name: request.name,
      organisation: request.organisation,
      demoVersion: parsed.data.demoVersion,
      role: "CLIENT",
    },
    create: {
      email: request.email,
      name: request.name,
      organisation: request.organisation,
      demoVersion: parsed.data.demoVersion,
      role: "CLIENT",
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

  // Send the welcome email with sign-in link
  let emailSent = false;
  try {
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const signinUrl = new URL("/auth/signin", process.env.AUTH_URL || "http://localhost:3000");
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: request.email,
        subject: `Your Reaction preview is ready`,
        html: welcomeEmail({
          name: request.name,
          organisation: request.organisation,
          signinUrl: signinUrl.toString(),
        }),
      });
      emailSent = true;
    }
  } catch (err) {
    console.error("Failed to send approval email:", err);
  }

  return NextResponse.json({ ok: true, userId: user.id, emailSent });
}

function welcomeEmail({
  name,
  organisation,
  signinUrl,
}: {
  name: string;
  organisation: string;
  signinUrl: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:48px 24px;background:#f4ede0;font-family:Georgia,serif;color:#0a0908;">
  <div style="max-width:560px;margin:0 auto;background:#fbf7ed;padding:48px 40px;border-radius:12px;border:1px solid rgba(10,9,8,0.12);">
    <div style="font-family:Georgia,serif;font-style:italic;font-size:32px;color:#b91c1c;margin-bottom:8px;letter-spacing:-0.02em;">Reaction</div>
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#756a5d;margin-bottom:32px;">Your preview is ready</div>

    <p style="font-size:18px;line-height:1.5;margin:0 0 20px;color:#0a0908;">
      Hi ${escapeHtml(name)},
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:#3a342d;">
      Thanks for registering your interest in <em style="color:#b91c1c;">Reaction</em>. We've set up a preview for ${escapeHtml(organisation)}.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 32px;color:#3a342d;">
      Sign in below to take a look — your account manager will be in touch shortly to schedule a guided walkthrough.
    </p>

    <div style="text-align:center;margin:36px 0;">
      <a href="${signinUrl}" style="display:inline-block;background:#0a0908;color:#fbf7ed;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;">Sign in to your preview →</a>
    </div>

    <p style="font-size:14px;line-height:1.6;color:#3a342d;margin:24px 0;">
      Just enter this email address and we'll send you a magic link — no password needed.
    </p>

    <hr style="border:none;border-top:1px solid rgba(10,9,8,0.12);margin:36px 0;" />

    <p style="font-size:13px;line-height:1.6;color:#756a5d;margin:0;">
      Questions? Reply to this email or write to <a href="mailto:info@reaction.org.uk" style="color:#b91c1c;">info@reaction.org.uk</a>.
    </p>
  </div>
  <div style="max-width:560px;margin:24px auto 0;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#756a5d;letter-spacing:0.06em;">
    Reaction is a university platform that connects students on and off campus.
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
