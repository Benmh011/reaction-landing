// ————————————————————————————————————————————————————————————————
// Reading Salcombe Dairy's own tub labels.
//
// Adapted from South Moor's lib/vm-ocr.ts. There the reader hunts for a
// medicine licence number in a band across the frame. Here it reads the
// whole label, because the label is the whole photo, and looks for the
// three things that identify a tub:
//
//     Code: 1028          the product, by their own code
//     Use by 04/12/27     the date, which on these labels is also the lot
//     5 Litres            the size, as a cross-check
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

import type { Material } from "./stock";

export type LabelFields = {
  code: string | null;
  useBy: string | null; // yyyy-mm-dd
  dateWords: string | null; // "Use by", "Best before" — as printed
  size: string | null; // "5 L"
  name: string | null; // the product line as printed
};

export const EMPTY_FIELDS: LabelFields = { code: null, useBy: null, dateWords: null, size: null, name: null };

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

// Line by line, as South Moor's reader does: letting a pattern run across a
// line break glues neighbouring numbers together.
export function readLabelText(text: string): LabelFields {
  const out: LabelFields = { ...EMPTY_FIELDS };
  const lines = String(text ?? "")
    .split(/[\r\n]+/)
    .map((l) => l.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!out.code) {
      const m = line.match(/\bc[o0]de\s*[:;.,]?\s*([0-9OoIl|!SB]{3,6})\b/i);
      if (m) {
        const d = digitsOnly(m[1]);
        if (/^\d{3,6}$/.test(d)) out.code = d;
      }
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
    if (!out.size) {
      const m = line.match(/\b(\d+(?:[.,]\d+)?)\s*(litres?|liters?|ltrs?|ml|kg)\b/i);
      if (m) {
        const unit = /^l/i.test(m[2]) ? "L" : m[2].toLowerCase();
        out.size = `${m[1].replace(",", ".")} ${unit}`;
      }
    }
    if (!out.name && /ice\s*cream|sorbet|gelato/i.test(line) && !/ingredient|contains|milk,/i.test(line)) {
      out.name = line.replace(/[^A-Za-z&'\- ]/g, "").replace(/\s+/g, " ").trim();
    }
  }
  return out;
}

// Merge readings from several passes: each field keeps the first pass that
// found it, so a later, noisier pass cannot overwrite a clean early one.
export function mergeFields(a: LabelFields, b: LabelFields): LabelFields {
  return {
    code: a.code ?? b.code,
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

function textHasWords(text: string, words: string[]): boolean {
  const t = text.toLowerCase().replace(/&/g, " ");
  return words.length > 0 && words.every((w) => t.includes(w));
}

export type Match =
  | { kind: "code"; material: Material; nameAgrees: boolean }
  | { kind: "name"; material: Material } // no code read; the name alone points to one product
  | { kind: "unknown-code"; code: string }
  | { kind: "none" };

// The code decides the product. The name on the label is only a
// cross-check: if it does not agree, the person is asked rather than told.
export function matchProduct(fields: LabelFields, fullText: string, materials: Material[]): Match {
  if (fields.code) {
    const m = materials.find((x) => x.labelCode === fields.code);
    if (!m) return { kind: "unknown-code", code: fields.code };
    return { kind: "code", material: m, nameAgrees: textHasWords(fullText, nameWords(m)) };
  }
  const byName = materials.filter((x) => x.labelCode && textHasWords(fullText, nameWords(x)));
  return byName.length === 1 ? { kind: "name", material: byName[0] } : { kind: "none" };
}

// These labels carry no batch number, so the code and the use-by date
// together stand for the lot: every tub of 1028 marked 04/12/27 is one lot.
// The same label always gives the same lot, whoever scans it.
export function lotFromLabel(code: string, isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${code}-${d}${m}${y.slice(2)}`;
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
// printed light on dark. The first pass that gives a known code and a date
// stops the run.
export type LabelPass = { label: string; invert: boolean; psm: "SINGLE_BLOCK" | "SPARSE_TEXT" | "AUTO" };
export const LABEL_PASSES: LabelPass[] = [
  { label: "as shot, text block", invert: false, psm: "SINGLE_BLOCK" },
  { label: "as shot, sparse text", invert: false, psm: "SPARSE_TEXT" },
  { label: "as shot, whole page", invert: false, psm: "AUTO" },
  { label: "inverted, text block", invert: true, psm: "SINGLE_BLOCK" },
];

export type LabelRecord = {
  fields: LabelFields;
  passes: { label: string; text: string }[];
  thumb: string | null;
  fullText: string;
  from: "site" | "internet";
  confirmed: boolean;
};
