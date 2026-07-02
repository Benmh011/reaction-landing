import { prisma } from "./db";

// SPC fetches are restricted to the authoritative VMD host. This keeps the
// "live, most-recent" lookup grounded in the source of truth and prevents the
// agent being pointed at arbitrary URLs.
const ALLOWED_HOST = "www.vmd.defra.gov.uk";

/** Fetch a product's Summary of Product Characteristics PDF from the VMD and
 *  return its extracted text. This is the live, always-current source for
 *  doses and withdrawal periods. */
export async function fetchSpcText(
  url: string,
  opts: { cacheToMedicationId?: string } = {},
): Promise<string> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("invalid SPC URL");
  }
  if (u.hostname !== ALLOWED_HOST) {
    throw new Error(`SPC fetch is restricted to ${ALLOWED_HOST}`);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SPC fetch HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const pdf = (await import("pdf-parse")).default;
  const out = await pdf(buf);
  const text = (out.text || "").replace(/[ \t]+\n/g, "\n").trim();

  // Optional: cache the extracted text so repeat lookups are instant.
  if (opts.cacheToMedicationId) {
    await prisma.medication
      .update({
        where: { id: opts.cacheToMedicationId },
        data: { spcText: text.slice(0, 100000) },
      })
      .catch(() => {});
  }

  return text;
}

/** Capture a section of SPC text from a start keyword up to an end keyword.
 *  Errs generous (over-capture is safe; under-capture could truncate a dose or
 *  withdrawal statement, which is not). */
function sliceSection(
  text: string,
  startRe: RegExp,
  endRe: RegExp,
  maxLen = 1500,
): string | null {
  const sm = startRe.exec(text);
  if (!sm) return null;
  const from = sm.index;
  const after = text.slice(from);
  const em = endRe.exec(after.slice(sm[0].length));
  const end = em ? sm[0].length + em.index : Math.min(after.length, maxLen);
  let block = after.slice(0, end).replace(/[ \t]+\n/g, "\n").trim();
  // Drop a dangling next-section number (e.g. a trailing "5." or "4.10").
  block = block.replace(/\n\s*\d{1,2}(\.\d{1,2})?\.?\s*$/, "").trim();
  return block.slice(0, maxLen) || null;
}

/** Pull the withdrawal-period and dose sections verbatim from SPC text. These
 *  are the safety-critical passages; we surface them as their own fields so the
 *  model quotes the authorised wording rather than reconstructing numbers. */
export function parseSpcSections(text: string): {
  withdrawal: string | null;
  dosage: string | null;
} {
  return {
    withdrawal: sliceSection(
      text,
      /withdrawal period/i,
      /pharmacological (?:particulars|properties)/i,
      1500,
    ),
    dosage: sliceSection(
      text,
      /amounts? to be administered and administration route|dosage and administration|posology and method of administration/i,
      /\boverdose\b/i,
      1800,
    ),
  };
}

/** Best-effort structured withdrawal values (for storage / a future formulary
 *  comparison view). The verbatim block from parseSpcSections remains the
 *  authoritative text shown to the vet; these are a convenience only. */
export function parseWithdrawalValues(
  withdrawalText: string | null,
): Record<string, string> | null {
  if (!withdrawalText) return null;
  const out: Record<string, string> = {};
  for (const key of ["Meat and offal", "Milk", "Eggs", "Honey"]) {
    const re = new RegExp(key + "[^\\n:]*[:\\-\\s]+([^\\n]{0,140})", "i");
    const m = re.exec(withdrawalText);
    if (m) out[key] = m[1].trim();
  }
  return Object.keys(out).length ? out : null;
}
