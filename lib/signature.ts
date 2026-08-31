// Set to false to render a text wordmark instead of the hosted PNG.
// Useful before the logo asset is uploaded, and as a fallback while
// Outlook still blocks remote images for a new sender.
const USE_IMAGE_WORDMARK = false

const WORDMARK_SRC = 'https://reaction.org.uk/signature/reaction-wordmark.png'
const WORDMARK_W = 128
const WORDMARK_H = 26

// Brand red — approximated from the site nav wordmark.
// Replace with the exact computed colour from reaction.org.uk.
const BRAND = '#C0392B'

const INK = '#0F1113'
const MUTED = '#5A5F66'
const FAINT = '#8A8F96'
const RULE = '#DAD5CA'

const SERIF = "Georgia,'Times New Roman',Times,serif"
const SANS = "Helvetica,Arial,'Segoe UI',sans-serif"

const SITE = 'https://reaction.org.uk'
const EMAIL = 'info@reaction.org.uk'
const BLURB =
  'Reaction builds locally hosted multi-agentic systems: a formation of small, ' +
  'specialised agents that move as one: inside your walls, around your workflows, ' +
  'in service of your team.'
const STRAPLINE = 'South Devon'

function wordmarkBlock(): string {
  if (USE_IMAGE_WORDMARK) {
    return [
      `<a href="${SITE}" style="text-decoration:none;border:0;">`,
      `<img src="${WORDMARK_SRC}" alt="Reaction" width="${WORDMARK_W}" height="${WORDMARK_H}"`,
      ` style="display:block;width:${WORDMARK_W}px;height:${WORDMARK_H}px;border:0;outline:none;`,
      `text-decoration:none;-ms-interpolation-mode:bicubic;">`,
      `</a>`,
    ].join('')
  }

  return [
    `<a href="${SITE}" style="font-family:${SERIF};font-size:22px;line-height:27px;`,
    `color:${BRAND};text-decoration:none;font-style:italic;font-weight:700;`,
    `letter-spacing:0.01em;">Reaction</a>`,
  ].join('')
}

export function buildSignatureHtml(): string {
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"`,
    ` style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;max-width:420px;">`,

    `<tr><td style="padding:0;">${wordmarkBlock()}</td></tr>`,

    `<tr><td style="padding:12px 0 0 0;font-size:0;line-height:0;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">`,
    `<tr><td width="40" height="2"`,
    ` style="width:40px;height:2px;background-color:${BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `</table></td></tr>`,

    `<tr><td style="padding:14px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;`,
    `color:${INK};mso-line-height-rule:exactly;">`,
    `<a href="mailto:${EMAIL}" style="color:${INK};text-decoration:none;">${EMAIL}</a><br>`,
    `<a href="${SITE}" style="color:${BRAND};text-decoration:none;">reaction.org.uk</a>`,
    `</td></tr>`,

    `<tr><td style="padding:14px 0 0 0;font-size:0;line-height:0;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"`,
    ` style="border-collapse:collapse;width:100%;">`,
    `<tr><td height="1" style="height:1px;background-color:${RULE};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `</table></td></tr>`,

    `<tr><td style="padding:12px 0 0 0;font-family:${SANS};font-size:12px;line-height:18px;`,
    `color:${MUTED};mso-line-height-rule:exactly;">${BLURB}</td></tr>`,

    `<tr><td style="padding:8px 0 0 0;font-family:${SANS};font-size:10px;line-height:15px;`,
    `color:${FAINT};mso-line-height-rule:exactly;">${STRAPLINE}</td></tr>`,

    `</table>`,
  ].join('')
}

export function buildSignatureText(): string {
  return [
    'Reaction',
    '',
    EMAIL,
    'reaction.org.uk',
    '',
    BLURB,
    STRAPLINE,
  ].join('\n')
}
