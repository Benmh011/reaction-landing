// ————————————————————————————————————————————————————————————————
// Reading Salcombe Dairy's own tub labels.
//
// Adapted from South Moor's lib/vm-ocr.ts. There the reader hunts for a
// medicine licence number in a band across the frame. Here it reads the
// whole label, because the label is the whole photo, and picks out two
// separate things:
//
//     Code: 1028               the batch number
//     Rum & Raisin Ice Cream   the product, from its description
//     5 Litres                 and its size, which tells a 5L tub from a
//                              500ml one of the same flavour
//
// along with the use-by date. The batch and the product are read on their
// own; neither is worked out from the other.
//
// The text reader (Tesseract, run by label-read.ts) only turns the picture
// into text, and it makes mistakes: frost, water and a curved tub all cost
// it characters. Everything in this file is fixed rules over that text, with
// no DOM and no reader, so it is tested against real readings. Nothing here
// decides on its own: a person confirms what was read before it is saved.
//
// Why a reader at all: printed words cannot be decoded by rules the way a
// barcode can. The barcode is always tried first; this runs only when
// there is none.
// ————————————————————————————————————————————————————————————————

import { parseNoteDate, type Material, type Movement } from "./stock";

export type LabelFields = {
  batch: string | null;
  useBy: string | null; // yyyy-mm-dd
  dateWords: string | null; // "Use by", "Best before" — as printed
  size: string | null; // "5 L", "500 ml"
  name: string | null; // the product line as printed
};

export const EMPTY_FIELDS: LabelFields = { batch: null, useBy: null, dateWords: null, size: null, name: null };

// Inside a number the reader confuses a few letters for digits. These are
// only ever applied to text already found in a number's position.
function digitsOnly(s: string): string {
  return s.replace(/[Oo]/g, "0").replace(/[Il|!]/g, "1").replace(/[Ss]/g, "5").replace(/B/g, "8");
}

function realDate(d: number, m: number, y: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// A typed or printed date, dd/mm/yy or dd/mm/yyyy, with . or - accepted.
export function parseLabelDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return realDate(Number(m[1]), Number(m[2]), y);
}

// The batch as printed after "Code", "Batch" or "Lot": all digits, where
// the reader's letter-for-digit slips are put right, or a short letter
// prefix and digits ("L1028"), kept as printed.
function batchToken(raw: string): string | null {
  const t = raw.replace(/[.,:;]+$/, "");
  if (/^[0-9OoIl|!SB]{3,8}$/.test(t)) {
    const d = digitsOnly(t);
    return /^\d{3,8}$/.test(d) && /\d.*\d/.test(t) ? d : null;
  }
  const m = t.match(/^([A-Za-z]{1,3})-?([0-9OoIl|!SB]{2,8})$/);
  if (m) {
    const d = digitsOnly(m[2]);
    return /^\d+$/.test(d) ? `${m[1].toUpperCase()}${d}` : null;
  }
  return null;
}

// A line from the ingredients or nutrition panel rather than the front of
// the label: those list things, so they carry commas.
function isListLine(line: string): boolean {
  return /ingredient|nutrition|typical|per\s*100/i.test(line) || (line.match(/,/g) ?? []).length >= 2;
}

// Line by line, as South Moor's reader does: letting a pattern run across a
// line break glues neighbouring numbers together.
export function readLabelText(text: string): LabelFields {
  const out: LabelFields = { ...EMPTY_FIELDS };
  const lines = String(text ?? "")
    .split(/[\r\n]+/)
    .map((l) => l.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!out.batch) {
      const m = line.match(/\b(?:c[o0]de|batch|l[o0]t)\s*(?:no\.?|number)?\s*[:;.,#]?\s*([A-Za-z0-9|!-]{2,12})/i);
      if (m) out.batch = batchToken(m[1]);
    }
    if (!out.useBy) {
      const m = line.match(
        /\b(use\s*by|best\s*before(?:\s*end)?|bbe?|exp(?:iry)?)\b[^\dA-Za-z]{0,6}([0-9OoIl|]{1,2})\s*[\/.\-]\s*([0-9OoIl|]{1,2})\s*[\/.\-]\s*([0-9OoIl|]{2,4})\b/i,
      );
      if (m) {
        const iso = parseLabelDate(`${digitsOnly(m[2])}/${digitsOnly(m[3])}/${digitsOnly(m[4])}`);
        if (iso) {
          out.useBy = iso;
          const w = m[1].toLowerCase().replace(/\s+/g, "");
          out.dateWords = w.startsWith("use") ? "Use by" : w.startsWith("best") ? "Best before" : w.startsWith("exp") ? "Expiry" : "Best before";
        }
      }
    }
    if (!out.size && !isListLine(line)) {
      // Litres spelt out, or ml; a bare "L" only as a capital. Grams are
      // not read: a sparse reading breaks the nutrition panel into pieces
      // ("5.68g") that no rule can tell from a pack size, and every tub is
      // sold by volume.
      const m =
        line.match(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(litres?|liters?|ltrs?|ml)\b/i) ??
        line.match(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(L)\b/);
      if (m) {
        const n = m[1].replace(",", ".");
        out.size = `${n} ${m[2].toLowerCase() === "ml" ? "ml" : "L"}`;
      }
    }
    if (!out.name && /ice\s*cream|sorbet|gelato|chocolate/i.test(line) && !isListLine(line) && !/contains/i.test(line)) {
      out.name = line.replace(/[^A-Za-z0-9%&'\- ]/g, "").replace(/\s+/g, " ").trim();
    }
  }
  return out;
}

// Merge readings from several passes: each field keeps the first pass that
// found it, so a later, noisier pass cannot overwrite a clean early one.
export function mergeFields(a: LabelFields, b: LabelFields): LabelFields {
  return {
    batch: a.batch ?? b.batch,
    useBy: a.useBy ?? b.useBy,
    dateWords: a.dateWords ?? b.dateWords,
    size: a.size ?? b.size,
    name: a.name ?? b.name,
  };
}

// ————————————————————————— which product —————————————————————————

// The words of a product's name that should appear on its label: the
// flavour before the pack size, without short words.
export function nameWords(m: Pick<Material, "name">): string[] {
  return m.name
    .split(/\s+[—–-]\s+/)[0]
    .toLowerCase()
    .replace(/&/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && w !== "and");
}

// A size as millilitres or grams, so "5 Litres", "5L" and "5000 ml" are
// the same thing.
export function sizeAmount(s: string): number | null {
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|litres?|liters?|ltrs?|kg|g)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  const u = m[2].toLowerCase();
  return u === "ml" || u === "g" ? n : n * 1000;
}

// A product's pack size, from the part of its name after the dash:
// "Rum & Raisin — 5L catering" is 5000.
export function packAmount(m: Pick<Material, "name">): number | null {
  const after = m.name.split(/\s+[—–-]\s+/)[1];
  return after ? sizeAmount(after) : null;
}

// The front of the label: every line that is not the ingredients or the
// nutrition panel. "Raisins" and "Rum" both appear in the ingredients of a
// Rum & Raisin tub, but so might "chocolate" in a mint choc chip; only the
// front says what the tub is.
function frontText(fullText: string): string {
  return fullText
    .split(/[\r\n]+/)
    .filter((l) => !isListLine(l))
    .join("\n");
}

function textHasWords(text: string, words: string[]): boolean {
  const t = text.toLowerCase().replace(/&/g, " ");
  return words.length > 0 && words.every((w) => t.includes(w));
}

export type ProductMatch =
  | { kind: "one"; material: Material }
  | { kind: "several"; options: Material[] }
  | { kind: "none" };

// The product, from the description and the size. The batch number plays
// no part: it is read and checked separately.
export function matchProduct(fields: LabelFields, fullText: string, materials: Material[]): ProductMatch {
  const finished = materials.filter((m) => m.kind === "finished");
  const where = [fields.name ?? "", frontText(fullText)].join("\n");
  let fits = finished.filter((m) => textHasWords(where, nameWords(m)));
  const want = fields.size ? sizeAmount(fields.size) : null;
  if (want) fits = fits.filter((m) => {
    const have = packAmount(m);
    return have !== null && Math.abs(have - want) <= want * 0.01;
  });
  if (fits.length === 1) return { kind: "one", material: fits[0] };
  if (fits.length > 1) return { kind: "several", options: fits };
  return { kind: "none" };
}

// ————————————————————————— the batch's own record —————————————————————————

export type BatchRecord = {
  batch: string;
  material: Material | undefined;
  materialCode: string;
  useBy: string | null; // yyyy-mm-dd
  madeAt: string;
  by: string;
};

// What the stock log says batch `batch` is: the product it made and the
// date it was given when it was made. A label printed "L1028" also finds
// batch 1028, since L is only the usual mark for a lot number.
export function batchRecord(batch: string, movements: Movement[], materials: Material[]): BatchRecord | null {
  const tries = [batch, batch.replace(/^L/i, "")];
  for (const lot of tries) {
    const y = movements.find((m) => m.reason === "production-yield" && m.lot === lot);
    if (!y) continue;
    const d = parseNoteDate(y.bestBefore);
    return {
      batch: lot,
      material: materials.find((x) => x.code === y.materialCode),
      materialCode: y.materialCode,
      useBy: d ? isoOf(d) : null,
      madeAt: y.at,
      by: y.by,
    };
  }
  return null;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// ————————————————————————— preparing the picture —————————————————————————

// How much to enlarge or shrink the photo for the reader: the label text
// on a phone photo is already large, so aim for about 2000 px on the long
// side rather than South Moor's enlarge-at-least-twice for a small line.
export function labelScale(w: number, h: number): number {
  return Math.min(2, Math.max(0.4, 2000 / Math.max(1, w, h)));
}

// RGBA to grey in place, optionally inverted — as South Moor's greyForOcr.
// No threshold: the reader binarises locally, which copes far better with a
// wet tub that is half glare and half shadow.
export function greyForOcr(rgba: Uint8ClampedArray, invert: boolean): void {
  for (let i = 0; i < rgba.length; i += 4) {
    let g = (rgba[i] * 306 + rgba[i + 1] * 601 + rgba[i + 2] * 117) >> 10;
    if (invert) g = 255 - g;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = g;
  }
}

// The passes, in order. A whole label is a block of text, so block first;
// sparse text second, for a photo at an angle; inverted last, for a label
// printed light on dark. The run stops at the first point where the
// batch, the date and the product are all known.
export type LabelPass = { label: string; invert: boolean; psm: "SINGLE_BLOCK" | "SPARSE_TEXT" | "AUTO" };
export const LABEL_PASSES: LabelPass[] = [
  { label: "as shot, text block", invert: false, psm: "SINGLE_BLOCK" },
  { label: "as shot, sparse text", invert: false, psm: "SPARSE_TEXT" },
  { label: "as shot, whole page", invert: false, psm: "AUTO" },
  { label: "inverted, text block", invert: true, psm: "SINGLE_BLOCK" },
];

export type LabelRecord = {
  fields: LabelFields;
  // What each pass read on its own, so a batch number one pass got wrong
  // and another got right can still be found.
  readings: LabelFields[];
  passes: { label: string; text: string }[];
  thumb: string | null;
  fullText: string;
  from: "site" | "internet";
  confirmed: boolean;
};
