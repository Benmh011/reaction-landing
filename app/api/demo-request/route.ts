import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { emailShell, buildListUnsubscribeHeader } from "@/lib/email-templates";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  organisation: z.string().min(2).max(200),
  role: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
  requestType: z.enum(["UNIVERSITY", "STUDENTS_UNION", "EMPLOYER", "CHARITY", "OTHER"]).default("UNIVERSITY"),
});

const REQUEST_TYPE_LABELS: Record<string, string> = {
  UNIVERSITY: "University",
  STUDENTS_UNION: "Students' Union",
  EMPLOYER: "Local employer / business",
  CHARITY: "Charity / community group",
  OTHER: "Other",
};

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

  const { name, email, organisation, role, message, requestType } = parsed.data;
  const lowerEmail = email.toLowerCase();

  // Persist the request
  const request = await prisma.demoRequest.create({
    data: {
      name,
      email: lowerEmail,
      organisation,
      role,
      message,
      requestType,
    },
  });

  const typeLabel = REQUEST_TYPE_LABELS[requestType] ?? requestType;
  const firstName = name.split(/\s+/)[0] || name;

  // ─── 1. Send admin notification + 2. Send prospect acknowledgment ───
  // Both wrapped in try/catch so a Resend hiccup doesn't break the request save.
  try {
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.ADMIN_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // ─── Admin notification (internal — no unsubscribe link) ───
      const adminBody = `
        <p style="margin:0 0 18px;">A new submission has been logged in the admin panel.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6e7178;width:130px;">Type</td><td style="padding:6px 0;color:#181410;font-weight:500;">${escapeHtml(typeLabel)}</td></tr>
          <tr><td style="padding:6px 0;color:#6e7178;">Name</td><td style="padding:6px 0;color:#181410;font-weight:500;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 0;color:#6e7178;">Email</td><td style="padding:6px 0;color:#181410;font-weight:500;">${escapeHtml(lowerEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:#6e7178;">Organisation</td><td style="padding:6px 0;color:#181410;font-weight:500;">${escapeHtml(organisation)}</td></tr>
          ${role ? `<tr><td style="padding:6px 0;color:#6e7178;">Role</td><td style="padding:6px 0;color:#181410;font-weight:500;">${escapeHtml(role)}</td></tr>` : ""}
          ${message ? `<tr><td style="padding:6px 0;color:#6e7178;vertical-align:top;">Message</td><td style="padding:6px 0;color:#181410;white-space:pre-wrap;">${escapeHtml(message)}</td></tr>` : ""}
        </table>
      `;
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        replyTo: lowerEmail,
        subject: `New demo request — ${organisation} (${typeLabel})`,
        html: emailShell({
          eyebrow: "New demo request",
          bodyHtml: adminBody,
          ctaText: "Open admin panel",
          ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://reaction.org.uk"}/admin/requests`,
          recipientEmail: process.env.ADMIN_EMAIL,
          includeUnsubscribe: false,
        }),
      });

      // ─── Prospect acknowledgment (marketing-adjacent — needs unsubscribe) ───
      // Only send if the prospect hasn't already opted out of marketing emails.
      // Defensive: if the marketingOptOut field doesn't exist yet (e.g. db migration
      // hasn't run), treat as not-opted-out and send the email.
      let optedOut = false;
      try {
        const existing = await prisma.user.findUnique({
          where: { email: lowerEmail },
          select: { marketingOptOut: true },
        });
        optedOut = existing?.marketingOptOut ?? false;
      } catch {
        // marketingOptOut column likely doesn't exist yet — fail open (send)
        optedOut = false;
      }

      if (!optedOut) {
        const prospectBody = `
          <p style="margin:0 0 14px;">Thanks for getting in touch about Reaction for <strong>${escapeHtml(organisation)}</strong>.</p>
          <p style="margin:0 0 14px;">We've logged your request and will respond within one business day with next steps — usually a short call to understand your students, followed by a tailored demo build you can share with colleagues.</p>
          <p style="margin:0;">In the meantime, feel free to reply to this email with any questions.</p>
        `;
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: lowerEmail,
          replyTo: process.env.ADMIN_EMAIL,
          subject: `We've received your demo request — Reaction`,
          html: emailShell({
            eyebrow: `Hi ${firstName}`,
            greeting: undefined, // already in eyebrow
            bodyHtml: prospectBody,
            ctaText: undefined,
            ctaUrl: undefined,
            recipientEmail: lowerEmail,
            includeUnsubscribe: true,
          }),
          headers: buildListUnsubscribeHeader(lowerEmail),
        });
      }
    }
  } catch (err) {
    console.error("Failed to send demo-request email(s):", err);
    // Do NOT fail the request — the form submission has been saved successfully.
  }

  return NextResponse.json({ ok: true, requestId: request.id });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
