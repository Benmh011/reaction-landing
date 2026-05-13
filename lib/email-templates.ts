// lib/email-templates.ts
//
// Single source of truth for all transactional and marketing email HTML.
// Provides:
//   - emailShell({title, eyebrow, intro, ctaText?, ctaUrl?, body?, footerEmail?, includeUnsubscribe?})
//     → returns full <html> string with branded header, body slot, and footer
//   - generateUnsubscribeToken(email)
//     → returns HMAC token for safe unsubscribe links (can't be forged without AUTH_SECRET)
//   - verifyUnsubscribeToken(email, token)
//     → returns true if the token is valid for that email
//
// Design choices:
//   - All styles inline (email clients strip <style> blocks)
//   - Newsreader-italic-styled serif with Georgia fallback (email clients won't load custom fonts;
//     Georgia is the most consistent serif fallback across Gmail/Outlook/Apple/etc.)
//   - Pearl grey background, deep navy CTA button, slate blue brand mark
//   - Footer always includes Reaction wordmark + reaction.org.uk + Contact + Unsubscribe (if non-transactional)
//   - Max-width 560px (industry standard for mobile-first email)

import crypto from "crypto";

// ─── Brand constants (centralised) ───
const BRAND = {
  bg:         "#e1e4e8",  // pearl grey page background
  card:       "#ffffff",  // white card
  brand:      "#4d6f99",  // slate blue (Reaction wordmark)
  brandDeep:  "#1a2238",  // deep navy (CTA button background)
  text:       "#181410",  // warm near-black body text
  textSoft:   "#4a443c",  // muted body text
  textMuted:  "#6e7178",  // captions, footer text
  rule:       "#c8ccd0",  // dividers
} as const;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://reaction.org.uk";
const CONTACT_EMAIL = "info@reaction.org.uk";

export interface EmailShellOptions {
  /** The plain-text subject equivalent — appears as eyebrow text */
  eyebrow: string;
  /** Optional greeting line above the main body, e.g. "Hi Sarah," */
  greeting?: string;
  /** Main body HTML (already escaped — caller's responsibility) */
  bodyHtml: string;
  /** Optional CTA button. Both text+url required if present. */
  ctaText?: string;
  ctaUrl?: string;
  /** Optional footnote below CTA, e.g. "This link expires in 24 hours" */
  ctaFootnote?: string;
  /** Recipient email — used to generate the unsubscribe link */
  recipientEmail: string;
  /** If true, the footer shows Unsubscribe. Set false for purely transactional emails
   *  (magic-link, password reset) where users can't unsubscribe without losing account access. */
  includeUnsubscribe: boolean;
}

/**
 * Build the full HTML for an outbound email.
 * Returns the complete <html>...</html> string ready for Resend's `html` field.
 */
export function emailShell(opts: EmailShellOptions): string {
  const { eyebrow, greeting, bodyHtml, ctaText, ctaUrl, ctaFootnote, recipientEmail, includeUnsubscribe } = opts;

  const ctaBlock = ctaText && ctaUrl
    ? `
      <div style="text-align:center;margin:36px 0;">
        <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;background:${BRAND.brandDeep};color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:'Inter','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;">${escapeText(ctaText)} →</a>
      </div>
      ${ctaFootnote ? `<p style="font-size:13px;line-height:1.55;color:${BRAND.textMuted};margin:0 0 24px;text-align:center;">${escapeText(ctaFootnote)}</p>` : ""}
    `
    : "";

  const greetingBlock = greeting
    ? `<p style="font-size:16px;line-height:1.55;margin:0 0 16px;color:${BRAND.text};">${escapeText(greeting)}</p>`
    : "";

  const unsubLink = includeUnsubscribe
    ? buildUnsubscribeLink(recipientEmail)
    : null;

  const footerLinks = [
    `<a href="${escapeAttr(SITE_URL)}" style="color:${BRAND.textMuted};text-decoration:none;">reaction.org.uk</a>`,
    `<a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND.textMuted};text-decoration:none;">Contact us</a>`,
    unsubLink ? `<a href="${escapeAttr(unsubLink)}" style="color:${BRAND.textMuted};text-decoration:none;">Unsubscribe</a>` : null,
  ].filter(Boolean).join(' &middot; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:48px 16px;background:${BRAND.bg};font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:${BRAND.text};">
  <div style="max-width:560px;margin:0 auto;background:${BRAND.card};padding:40px 32px;border-radius:14px;border:1px solid ${BRAND.rule};">

    <!-- Brand mark -->
    <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;color:${BRAND.brand};line-height:1;margin:0 0 6px;letter-spacing:-0.02em;">Reaction</div>

    <!-- Eyebrow -->
    <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.textMuted};margin-bottom:28px;">${escapeText(eyebrow)}</div>

    <!-- Greeting -->
    ${greetingBlock}

    <!-- Body -->
    <div style="font-size:15px;line-height:1.6;color:${BRAND.textSoft};">${bodyHtml}</div>

    <!-- CTA -->
    ${ctaBlock}

    <!-- Divider before footer -->
    <hr style="border:none;border-top:1px solid ${BRAND.rule};margin:36px 0 20px;" />

    <!-- Footer (inside card) -->
    <div style="font-size:11px;line-height:1.6;color:${BRAND.textMuted};text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:${BRAND.brand};margin-bottom:4px;letter-spacing:-0.015em;">Reaction</div>
      <div style="margin-bottom:8px;">University software for student connection.</div>
      <div>${footerLinks}</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Unsubscribe token (HMAC over email + AUTH_SECRET) ───
//
// Why: a naked /unsubscribe?email=X link is forgeable — anyone could unsubscribe
// anyone they knew the email of. Adding a token bound to AUTH_SECRET means only
// emails we sent can be acted on. AUTH_SECRET should be in Vercel env already.

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // Defensive fallback so dev doesn't crash. Token will still work consistently
    // within a single session — but logs a warning so the missing env var is visible.
    console.warn("[email-templates] AUTH_SECRET not set — using insecure fallback for unsubscribe tokens");
    return "dev-fallback-do-not-use-in-production";
  }
  return s;
}

export function generateUnsubscribeToken(email: string): string {
  const h = crypto.createHmac("sha256", getSecret());
  h.update(email.toLowerCase().trim());
  return h.digest("hex").slice(0, 16); // 16 chars is plenty for this use
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  if (token.length !== expected.length) return false;
  // Timing-safe comparison (avoid leaking length-of-prefix-match)
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

function buildUnsubscribeLink(email: string): string {
  const token = generateUnsubscribeToken(email);
  const params = new URLSearchParams({ email, token });
  return `${SITE_URL}/unsubscribe?${params.toString()}`;
}

/** Build the value for the List-Unsubscribe header. RFC 2369 + RFC 8058 compliant. */
export function buildListUnsubscribeHeader(email: string): { "List-Unsubscribe": string; "List-Unsubscribe-Post": string } {
  const link = buildUnsubscribeLink(email);
  return {
    "List-Unsubscribe": `<mailto:${CONTACT_EMAIL}?subject=unsubscribe>, <${link}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

// ─── HTML escape helpers ───

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function escapeAttr(s: string): string {
  return escapeText(s);
}
