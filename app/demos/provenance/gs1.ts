// Copied unchanged from the South Moor PMS (lib/gs1.ts, 12 Oct 2026).
// Shared scanner code: keep it identical to South Moor's so a fix in one
// can be carried to the other.

/* ---------------------------------------------------------------------------
 * gs1.ts — what a scanned code says.
 *
 * Three kinds of code reach the practice. A plain retail barcode (EAN-13,
 * UPC-A, EAN-8) is just a GTIN. A GS1 element string — the DataMatrix or
 * GS1-128 on a medicine pack — is a GTIN followed by application
 * identifiers, of which the ones that matter here are (10) batch, (17)
 * expiry and (21) serial: read those and goods-in has product, batch and
 * expiry with nothing typed. And our own label, an opaque token printed as a
 * QR for stock that arrived with no usable code.
 *
 * Pure functions, no imports: the phone parses offline with the same code
 * the server uses, and both are tested against real pack strings.
 * ------------------------------------------------------------------------- */

export type Scan =
  | { kind: "gtin"; gtin: string; raw: string }
  | {
      kind: "gs1"; gtin: string | null; batch: string | null; expiry: string | null;
      /** The pack printed the expiry as a month ("270500"): the date is the
       *  month's last day, as GS1 says, and a typed "05/2027" means the same. */
      expiryIsMonthEnd: boolean;
      serial: string | null; ais: Record<string, string>; raw: string;
    }
  | { kind: "label"; label: "B" | "L"; code: string; raw: string }
  | { kind: "unknown"; raw: string; problem?: string };

const GS = "\u001d"; // FNC1 as delivered by a scanner: the group separator
const LABEL_RE = /^SMV:([BL]):([0-9A-HJKMNP-TV-Z]{10})$/;

/** The GTIN check digit (mod-10, weights 3 and 1 from the right) for the
 *  digits before it. */
export function gtinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = body.charCodeAt(body.length - 1 - i) - 48;
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** A GTIN of 8, 12, 13 or 14 digits as its 14-digit form, or null when the
 *  check digit is wrong — a misread is worse than no read. */
export function normaliseGtin(s: string): string | null {
  const digits = s.replace(/\s+/g, "");
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return null;
  if (gtinCheckDigit(digits.slice(0, -1)) !== Number(digits.slice(-1))) return null;
  return digits.padStart(14, "0");
}

// The application identifiers GS1 defines. Anything else at the head of an
// element is a misread, and the parse stops there: a scuffed DataMatrix must
// come out as "couldn't read that", never as a plausible-looking batch.
const KNOWN_2 = new Set(["00", "01", "02", "03", "10", "11", "12", "13", "15", "16", "17", "20", "21", "22", "30", "37", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99"]);
const KNOWN_3 = new Set(["235", "240", "241", "242", "243", "250", "251", "253", "254", "255", "400", "401", "402", "403", "410", "411", "412", "413", "414", "415", "416", "417", "420", "421", "422", "423", "424", "425", "426", "427", "710", "711", "712", "713", "714", "715", "716"]);
const KNOWN_4 = /^(3[1-6]\d\d|39[0-5]\d|43[0-3]\d|700[1-9]|701[01]|702[0-3]|703\d|7040|723\d|724[0-2]|800[1-9]|801[0-3]|801[7-9]|8020|8026|8030|811[0-2]|8200)$/;
function knownAi(ai: string): boolean {
  return ai.length === 2 ? KNOWN_2.has(ai) : ai.length === 3 ? KNOWN_3.has(ai) : ai.length === 4 ? KNOWN_4.test(ai) : false;
}
/** The application identifier at the head of `s`, or null when none of the
 *  two-, three- or four-digit readings is one GS1 defines. */
function takeAi(s: string): string | null {
  for (const n of [2, 3, 4]) {
    const ai = s.slice(0, n);
    if (ai.length === n && /^\d+$/.test(ai) && knownAi(ai)) return ai;
  }
  return null;
}

// Application identifiers with a fixed data length; everything else runs to
// the next group separator or the end of the string. Lengths exclude the AI.
const FIXED: Record<string, number> = {
  "00": 18, "01": 14, "02": 14, "03": 14,
  "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6, "20": 2,
  "402": 17, "410": 13, "411": 13, "412": 13, "413": 13, "414": 13, "415": 13, "416": 13, "417": 13,
  "422": 3, "424": 3, "426": 3,
  "7001": 13, "7003": 10, "7006": 6, "7040": 4, "7241": 2,
  "8001": 14, "8005": 6, "8006": 18, "8017": 18, "8018": 18, "8026": 18, "8111": 4,
};
function fixedLength(ai: string): number | undefined {
  if (FIXED[ai] !== undefined) return FIXED[ai];
  if (/^3[1-6]\d\d$/.test(ai)) return 6; // weights and measures, 31xx–36xx
  return undefined;
}

// The longest a variable-length field may be. A batch number is at most 20
// characters; a "batch" of 25 with no separator after it is the next field
// misread into this one, and the parse says so rather than keeping it.
const MAX: Record<string, number> = {
  "10": 20, "21": 20, "22": 20, "30": 8, "37": 8, "90": 30,
  "240": 30, "241": 30, "242": 6, "243": 20, "250": 30, "251": 30, "253": 30, "254": 20, "255": 25,
  "400": 30, "401": 30, "403": 30, "420": 20, "421": 12, "423": 15, "425": 15, "427": 3,
  "710": 20, "711": 20, "712": 20, "713": 20, "714": 20, "715": 20, "716": 20,
  "7002": 30, "7004": 4, "7005": 12, "7007": 12, "7008": 3, "7009": 10, "7010": 2, "7020": 20, "7021": 20, "7022": 20, "7023": 30,
  "8002": 20, "8003": 30, "8004": 30, "8007": 34, "8008": 12, "8009": 50, "8010": 30, "8011": 12, "8012": 20, "8013": 25, "8019": 10, "8020": 25, "8030": 90, "8110": 70, "8112": 70, "8200": 70,
};
function maxLength(ai: string): number {
  if (MAX[ai] !== undefined) return MAX[ai];
  if (/^9[1-9]$/.test(ai)) return 90; // company internal, 91–99
  if (/^703\d$/.test(ai)) return 30;
  return 90;
}

export type Gs1Parse = { ais: Record<string, string>; problem: null } | { ais: null; problem: string };

/** "261231" → "2026-12-31"; a day of 00 means the end of that month. */
export function gs1Date(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2)), mm = Number(yymmdd.slice(2, 4));
  let dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12) return null;
  // GS1's rule: 51 to 99 years ahead of this year's two digits is the previous
  // century, 50 to 99 behind is the next, anything else is this one.
  const now = new Date().getUTCFullYear();
  const nowYY = now % 100, base = now - nowYY;
  const diff = yy - nowYY;
  const year = (diff >= 51 ? base - 100 : diff <= -50 ? base + 100 : base) + yy;
  const last = new Date(Date.UTC(year, mm, 0)).getUTCDate();
  if (dd === 0) dd = last;
  if (dd > last) return null;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Parse a GS1 element string into its application identifiers. Accepts the
 *  raw form a scanner delivers (FNC1 as \u001d between variable-length
 *  elements) and the human-readable bracketed form "(01)…(17)…(10)…". An
 *  identifier GS1 does not define, or a fixed-length field cut short, stops
 *  the parse and says why: nothing read before it is trusted either, because
 *  a misread anywhere is a misread everywhere. */
export function parseGs1Strict(s: string): Gs1Parse {
  const ais: Record<string, string> = {};
  let rest = s;
  if (!rest.length) return { ais: null, problem: "nothing to read" };
  if (/^\(\d{2,4}\)/.test(rest)) {
    // Bracketed: split on the brackets.
    const re = /\((\d{2,4})\)([^(]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(rest))) {
      if (!knownAi(m[1])) return { ais: null, problem: `(${m[1]}) is not an application identifier GS1 defines` };
      const len = fixedLength(m[1]);
      if (len !== undefined && m[2].length < len) return { ais: null, problem: `(${m[1]}) is cut short: ${m[2].length} of ${len} characters` };
      ais[m[1]] = m[2];
    }
    return Object.keys(ais).length ? { ais, problem: null } : { ais: null, problem: "nothing to read" };
  }
  while (rest.length) {
    if (rest.startsWith(GS)) { rest = rest.slice(1); continue; }
    const ai = takeAi(rest);
    if (!ai) return { ais: null, problem: `"${rest.slice(0, 4)}" is not an application identifier GS1 defines` };
    rest = rest.slice(ai.length);
    const len = fixedLength(ai);
    if (len !== undefined) {
      const field = rest.slice(0, len);
      if (field.length < len) return { ais: null, problem: `(${ai}) is cut short: ${field.length} of ${len} characters` };
      if (/[\u001d]/.test(field)) return { ais: null, problem: `(${ai}) is cut short by a separator` };
      ais[ai] = field;
      rest = rest.slice(len);
    } else {
      const end = rest.indexOf(GS);
      const field = end === -1 ? rest : rest.slice(0, end);
      if (!field.length) return { ais: null, problem: `(${ai}) is empty` };
      const max = maxLength(ai);
      if (field.length > max) return { ais: null, problem: `(${ai}) runs to ${field.length} characters with no separator; ${max} is the most it can be, so the rest — "${field.slice(max, max + 12)}…" — is another field misread into it` };
      ais[ai] = field;
      rest = end === -1 ? "" : rest.slice(end + 1);
    }
  }
  return Object.keys(ais).length ? { ais, problem: null } : { ais: null, problem: "nothing to read" };
}

/** The identifiers, or null when the string does not read as GS1. */
export function parseGs1(s: string): Record<string, string> | null {
  return parseGs1Strict(s).ais;
}

/** What a scanned string is. Symbology identifiers ("]d2", "]C1", "]Q3",
 *  "]E0") are stripped first; scanners that send them tell us the family,
 *  but the content is read the same way regardless. */
export function readScan(rawIn: string): Scan {
  const raw = rawIn.trim();
  let s = raw;
  let symbology: string | null = null;
  if (/^\][A-Za-z]\d/.test(s)) { symbology = s.slice(0, 3); s = s.slice(3); }
  const label = LABEL_RE.exec(s);
  if (label) return { kind: "label", label: label[1] as "B" | "L", code: label[2], raw };
  const gtin = normaliseGtin(s);
  if (gtin && !/^01\d{14}/.test(s)) return { kind: "gtin", gtin, raw };
  // A GS1 string: starts with an AI, or the scanner said so, or it is bracketed.
  const gs1Like = /^(\(\d{2,4}\)|01\d{14}|\u001d)/.test(s) || symbology === "]d2" || symbology === "]C1" || symbology === "]Q3";
  // The right length for a barcode, all digits, and the check digit wrong:
  // a misread, said loudly, never a new product.
  if (!gs1Like && /^\d+$/.test(s) && [8, 12, 13, 14].includes(s.length)) {
    return { kind: "unknown", raw, problem: `Barcode ${s} fails its check digit — a misread, not a new product. Scan it again, flatter and in better light.` };
  }
  if (gs1Like) {
    const parsed = parseGs1Strict(s);
    if (parsed.ais) {
      const ais = parsed.ais;
      const g = ais["01"] ? normaliseGtin(ais["01"]) : null;
      return {
        kind: "gs1",
        gtin: g,
        batch: ais["10"]?.trim() || null,
        expiry: ais["17"] ? gs1Date(ais["17"]) : null,
        expiryIsMonthEnd: !!ais["17"] && /^\d{4}00$/.test(ais["17"]),
        serial: ais["21"]?.trim() || null,
        ais,
        raw,
      };
    }
    // It set out as a pack code and went wrong part way: say where, and
    // trust none of it.
    return { kind: "unknown", raw, problem: `Couldn't read that pack code: ${parsed.problem}. Scan it again, flatter and in better light.` };
  }
  return { kind: "unknown", raw };
}

/** A typed expiry the way a pack prints it — "08/2027", "8/27", "2027-08"
 *  or a full date — as "YYYY-MM-DD". A month alone is its last day, which
 *  is the GS1 day-00 rule, so a typed month and a scanned month agree. Null
 *  when it is not a date. */
export function typedExpiry(input: string): string | null {
  const s = input.trim();
  const lastDay = (y: number, mo: number) => new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const out = (y: number, mo: number, d: number) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > lastDay(y, mo)) return null;
    return out(y, mo, d);
  }
  // A month: "08/2027", "8/27", "08-2027", "08.2027", "2027-08".
  let y: number | null = null, mo: number | null = null;
  if ((m = /^(\d{1,2})\s*[\/.-]\s*(\d{2}|\d{4})$/.exec(s))) { mo = Number(m[1]); y = Number(m[2]) + (m[2].length === 2 ? 2000 : 0); }
  else if ((m = /^(\d{4})-(\d{1,2})$/.exec(s))) { y = Number(m[1]); mo = Number(m[2]); }
  if (y === null || mo === null || mo < 1 || mo > 12 || y < 2000 || y > 2099) return null;
  return out(y, mo, lastDay(y, mo));
}

/** The text printed in our QR labels. B: a batch on the shelf. L: a stock
 *  location (a shelf, a car), for transfers and counts. */
export function labelText(label: "B" | "L", code: string): string {
  return `SMV:${label}:${code}`;
}

/** Ten characters of Crockford base32 from 50 random bits — no vowels or
 *  look-alikes, so a scuffed label read by eye is still typeable. */
export function labelCodeFrom(bytes: Uint8Array): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = 0, acc = 0, out = "";
  for (const b of bytes) {
    acc = (acc << 8) | b; bits += 8;
    while (bits >= 5 && out.length < 10) { out += alphabet[(acc >>> (bits - 5)) & 31]; bits -= 5; }
    if (out.length === 10) break;
  }
  if (out.length < 10) throw new Error("not enough bytes for a label code");
  return out;
}
