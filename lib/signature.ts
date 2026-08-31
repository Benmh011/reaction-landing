// Set to false to render a text wordmark instead of the hosted PNG.
// Useful before the logo asset is uploaded, and as a fallback while
// Outlook still blocks remote images for a new sender.
const USE_IMAGE_WORDMARK = false

const WORDMARK_SRC = 'https://reaction.org.uk/signature/reaction-wordmark.png'
const WORDMARK_W = 128
const WORDMARK_H = 26

const INK = '#0F1113'
const MUTED = '#5A5F66'
const FAINT = '#8A8F96'
const BRASS = '#B0894F'
const RULE = '#DAD5CA'

const SERIF = "Georgia,'Times New Roman',Times,serif"
const SANS = "Helvetica,Arial,'Segoe UI',sans-serif"

const SITE = 'https://reaction.org.uk'
const EMAIL = 'info@reaction.org.uk'
const TAGLINE = 'Every action has an equal and opposite Reaction.'
const STRAPLINE = 'Locally hosted multi-agentic systems · South Devon'

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
    `<a href="${SITE}" style="font-family:${SERIF};font-size:21px;line-height:26px;`,
    `color:${INK};text-decoration:none;letter-spacing:0.02em;">Reaction</a>`,
  ].join('')
}

export function buildSignatureHtml(): string {
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"`,
    ` style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;max-width:380px;">`,

    `<tr><td style="padding:0;">${wordmarkBlock()}</td></tr>`,

    `<tr><td style="padding:12px 0 0 0;font-size:0;line-height:0;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">`,
    `<tr><td width="40" height="2"`,
    ` style="width:40px;height:2px;background-color:${BRASS};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `</table></td></tr>`,

    `<tr><td style="padding:14px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;`,
    `color:${INK};mso-line-height-rule:exactly;">`,
    `<a href="mailto:${EMAIL}" style="color:${INK};text-decoration:none;">${EMAIL}</a><br>`,
    `<a href="${SITE}" style="color:${BRASS};text-decoration:none;">reaction.org.uk</a>`,
    `</td></tr>`,

    `<tr><td style="padding:14px 0 0 0;font-size:0;line-height:0;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"`,
    ` style="border-collapse:collapse;width:100%;">`,
    `<tr><td height="1" style="height:1px;background-color:${RULE};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `</table></td></tr>`,

    `<tr><td style="padding:12px 0 0 0;font-family:${SERIF};font-size:12px;line-height:17px;`,
    `color:${MUTED};font-style:italic;mso-line-height-rule:exactly;">${TAGLINE}</td></tr>`,

    `<tr><td style="padding:6px 0 0 0;font-family:${SANS};font-size:10px;line-height:15px;`,
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
    TAGLINE,
    STRAPLINE,
  ].join('\n')
}
