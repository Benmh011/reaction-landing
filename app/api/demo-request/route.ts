import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  organisation: z.string().min(2).max(200),
  role: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
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
    return NextResponse.json({ error: "Please fill in all required fields correctly." }, { status: 400 });
  }

  const { name, email, organisation, role, message } = parsed.data;
  const lowerEmail = email.toLowerCase();

  // Persist the request
  const request = await prisma.demoRequest.create({
    data: {
      name,
      email: lowerEmail,
      organisation,
      role,
      message,
    },
  });

  // Notify admin via Resend (non-blocking — if it fails we still saved the request)
  try {
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.ADMIN_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        replyTo: lowerEmail,
        subject: `New demo request — ${organisation}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;">
            <h2 style="font-style:italic;color:#b91c1c;margin:0 0 8px;">New demo request</h2>
            <p style="color:#756a5d;font-size:13px;margin:0 0 24px;">A new submission has been logged in the admin panel.</p>
            <table style="width:100%;border-collapse:collapse;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;">
              <tr><td style="padding:8px 0;color:#756a5d;width:140px;">Name</td><td style="padding:8px 0;color:#0a0908;font-weight:500;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding:8px 0;color:#756a5d;">Email</td><td style="padding:8px 0;color:#0a0908;font-weight:500;">${escapeHtml(lowerEmail)}</td></tr>
              <tr><td style="padding:8px 0;color:#756a5d;">Organisation</td><td style="padding:8px 0;color:#0a0908;font-weight:500;">${escapeHtml(organisation)}</td></tr>
              ${role ? `<tr><td style="padding:8px 0;color:#756a5d;">Role</td><td style="padding:8px 0;color:#0a0908;font-weight:500;">${escapeHtml(role)}</td></tr>` : ""}
              ${message ? `<tr><td style="padding:8px 0;color:#756a5d;vertical-align:top;">Message</td><td style="padding:8px 0;color:#0a0908;white-space:pre-wrap;">${escapeHtml(message)}</td></tr>` : ""}
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#756a5d;">Review and approve in the admin panel.</p>
          </div>
        `,
      });
    }
  } catch (err) {
    console.error("Failed to send admin notification email:", err);
    // Don't surface this to the user — the request itself is saved.
  }

  return NextResponse.json({ ok: true, requestId: request.id });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
