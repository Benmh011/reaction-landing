// ————————————————————————————————————————————————————————————————
// Production, written into stock.
//
// A batch is not only a record of how it was made. It uses up ingredient
// lots and it creates a lot of finished product, and both belong in the
// movement log — because that log is what Recall reads. Until this
// existed, Production and Stock were two separate worlds: a batch whose
// metal detector missed a piece could not be traced anywhere, and the
// question an auditor asks next — where did it go? — had no answer.
//
// So a batch now writes:
//
//   - one "production-consume" movement per ingredient lot it drew on,
//     each carrying the batch code, which is exactly the link Recall
//     follows back from a batch to its inputs and forward from an input
//     to every batch made from it; and
//   - one "production-yield" movement creating the finished lot, under
//     the batch code, into dispatch holding.
//
// Ingredients are drawn earliest-expiry-first, which is the food industry
// norm, from stock as it stood when the batch was made — a batch made on
// Tuesday can only use what was in the building on Tuesday. Nothing is
// ever drawn from quarantine. Packaging, which has no date, is drawn
// oldest delivery first.
//
// If there is not enough of something, the batch does not borrow stock
// that was never there. It uses what exists and reports the shortfall, so
// the record says plainly that part of an input cannot be traced rather
// than inventing a lot to cover it.
//
// The recipes below are placeholders. They are plausible proportions for
// an ice cream mix and a 70% bar, written so the trace has something real
// to follow — not Salcombe Dairy's recipes, which are commercially
// sensitive and belong in the database once there is one.
// ————————————————————————————————————————————————————————————————

import {
  MATERIALS,
  LOCATIONS,
  balances,
  fmtDate,
  parseNoteDate,
  type Material,
  type Movement,
  type Unit,
} from "./stock";
import type { Batch } from "./production";

// How much of an ingredient a batch uses: per litre of mix (per kilogram
// for chocolate), or per unit packed for packaging.
export type RecipeLine = { code: string; per: number; basis: "mix" | "unit" };

// The common base of an ice cream mix, per litre.
const MIX_BASE: RecipeLine[] = [
  { code: "RM-MILK", per: 0.62, basis: "mix" },
  { code: "RM-CREAM", per: 0.2, basis: "mix" },
  { code: "RM-SUGAR", per: 0.14, basis: "mix" },
  { code: "RM-GLUC", per: 0.03, basis: "mix" },
  { code: "RM-STAB", per: 0.005, basis: "mix" },
];
const TUB2: RecipeLine[] = [
  { code: "PK-TUB2", per: 1, basis: "unit" },
  { code: "PK-LID", per: 1, basis: "unit" },
];
const TUB500: RecipeLine[] = [
  { code: "PK-TUB500", per: 1, basis: "unit" },
  { code: "PK-LID", per: 1, basis: "unit" },
];

export const RECIPES: Record<string, RecipeLine[]> = {
  "FG-VAN2": [...MIX_BASE, { code: "RM-VAN", per: 0.004, basis: "mix" }, ...TUB2],
  "FG-SALT2": [...MIX_BASE, ...TUB2],
  "FG-SALT5": [...MIX_BASE, ...TUB500],
  "FG-STRAW5": [...MIX_BASE, { code: "RM-FRUIT", per: 0.12, basis: "mix" }, ...TUB500],
  "FG-HONEY2": [...MIX_BASE, ...TUB2],
  "FG-MINT5": [...MIX_BASE, ...TUB500],
  "FG-CHOC5": [...MIX_BASE, ...TUB500],
  "FG-BAR70": [
    { code: "RM-COCOA", per: 0.7, basis: "mix" },
    { code: "RM-SUGAR", per: 0.3, basis: "mix" },
    { code: "PK-BAR", per: 1, basis: "unit" },
  ],
};

// Finished products that can be made, for pickers.
export function makeableProducts(): Material[] {
  return MATERIALS.filter((m) => m.kind === "finished" && RECIPES[m.code]);
}

// Which finished product a batch makes. An explicit code wins; otherwise
// the batch's product name is matched to a finished material by name,
// ignoring case and the difference between a hyphen and a dash — which is
// how a chart recorder tends to write it.
export function productCodeFor(batch: Pick<Batch, "product"> & { productCode?: string }): string | undefined {
  if (batch.productCode && RECIPES[batch.productCode]) return batch.productCode;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  const want = clean(batch.product);
  return makeableProducts().find((m) => clean(m.name) === want)?.code;
}

// Whether a batch's output is already in stock. Read from the log rather
// than stored, so it cannot disagree with what the log says.
export function isBooked(batchId: string, movements: Movement[]): boolean {
  return movements.some((m) => m.reason === "production-yield" && m.lot === batchId);
}

// What a batch was made from, for showing on the batch and its record.
export type Input = { materialCode: string; material?: Material; lot: string; qty: number; unit: Unit };

export function madeFrom(batchId: string, movements: Movement[]): Input[] {
  const acc = new Map<string, Input>();
  for (const m of movements) {
    if (m.reason !== "production-consume" || m.ref !== batchId) continue;
    const key = `${m.materialCode}|${m.lot}`;
    const cur = acc.get(key);
    if (cur) cur.qty += Math.abs(m.qty);
    else
      acc.set(key, {
        materialCode: m.materialCode,
        material: MATERIALS.find((x) => x.code === m.materialCode),
        lot: m.lot,
        qty: Math.abs(m.qty),
        unit: m.unit,
      });
  }
  return [...acc.values()];
}

// ————————————————————————— drawing ingredients —————————————————————————

const HOLDING = new Set(LOCATIONS.filter((l) => l.holding).map((l) => l.id));

function round(qty: number, unit: Unit): number {
  return unit === "units" ? Math.round(qty) : Math.round(qty * 10) / 10;
}

// The lots of one material that could be used at a moment, in the order
// they should be used: earliest best-before first; undated stock oldest
// delivery first. Quarantine is never offered.
function candidates(code: string, movements: Movement[], atTs: number) {
  const upTo = movements.filter((m) => m.ts <= atTs);
  const firstSeen = new Map<string, number>();
  for (const m of upTo) {
    if (m.materialCode !== code) continue;
    const k = m.lot;
    if (!firstSeen.has(k) || m.ts < firstSeen.get(k)!) firstSeen.set(k, m.ts);
  }
  // The stock engine's own date reader, not Date.parse: Safari is stricter
  // than Chrome about date strings, and "01 Oct 2026" is exactly the kind
  // it can refuse.
  const bb = (s?: string) => parseNoteDate(s)?.getTime() ?? Number.POSITIVE_INFINITY;
  return balances(upTo)
    .filter((b) => b.materialCode === code && b.qty > 0.0001 && !HOLDING.has(b.locationId))
    .sort(
      (a, b) =>
        bb(a.bestBefore) - bb(b.bestBefore) ||
        (firstSeen.get(a.lot) ?? 0) - (firstSeen.get(b.lot) ?? 0),
    );
}

export type Shortfall = { materialCode: string; name: string; short: number; unit: Unit };

export type BatchStock = {
  moves: Movement[];
  shortfalls: Shortfall[];
};

// The movements a batch writes. Nothing is written for a batch that was
// stopped, for a product with no recipe, or for one with nothing packed.
export function batchMovements(
  batch: Batch & { productCode?: string },
  movements: Movement[],
  by: string,
  atTs: number,
): BatchStock {
  const code = productCodeFor(batch);
  const recipe = code ? RECIPES[code] : undefined;
  if (batch.stopped || !code || !recipe || !(batch.unitsMade > 0)) return { moves: [], shortfalls: [] };

  const at = fmtDate(new Date(atTs));
  const moves: Movement[] = [];
  const shortfalls: Shortfall[] = [];
  // Draw against a running view, so two lines needing the same material
  // (none do today, but a recipe could) cannot both take the same kilo.
  let view = movements;

  recipe.forEach((line, i) => {
    const mat = MATERIALS.find((x) => x.code === line.code);
    if (!mat) return;
    let need = round(line.per * (line.basis === "mix" ? batch.volume : batch.unitsMade), mat.unit);
    if (!(need > 0)) return;
    let n = 0;
    for (const lot of candidates(line.code, view, atTs)) {
      if (need <= 0) break;
      const take = round(Math.min(need, lot.qty), mat.unit);
      if (!(take > 0)) continue;
      const m: Movement = {
        id: `pc-${batch.id}-${i}${n ? `-${n}` : ""}`,
        materialCode: line.code,
        lot: lot.lot,
        locationId: lot.locationId,
        qty: -take,
        unit: mat.unit,
        reason: "production-consume",
        ts: atTs,
        at,
        by,
        ref: batch.id,
        bestBefore: lot.bestBefore,
      };
      moves.push(m);
      view = [...view, m];
      need = round(need - take, mat.unit);
      n++;
    }
    if (need > 0) shortfalls.push({ materialCode: line.code, name: mat.name, short: need, unit: mat.unit });
  });

  const product = MATERIALS.find((x) => x.code === code)!;
  const made = new Date(atTs);
  const bestBefore = product.shelfLifeDays
    ? fmtDate(new Date(made.getFullYear(), made.getMonth(), made.getDate() + product.shelfLifeDays))
    : undefined;
  moves.push({
    id: `py-${batch.id}`,
    materialCode: code,
    lot: batch.id,
    locationId: "WH-DISP",
    qty: batch.unitsMade,
    unit: "units",
    reason: "production-yield",
    ts: atTs,
    at,
    by,
    ref: batch.id,
    bestBefore,
  });

  return { moves, shortfalls };
}

// What a batch needed that the log cannot account for. Worked out by
// comparing the recipe against what was actually drawn, rather than saved
// at the time, so it can never disagree with the log it describes. Empty
// for a batch that was fully traced — and for one with no recipe, where
// there is nothing to compare against.
export function untraced(batch: Batch & { productCode?: string }, movements: Movement[]): Shortfall[] {
  const code = productCodeFor(batch);
  const recipe = code ? RECIPES[code] : undefined;
  if (!recipe || batch.stopped || !isBooked(batch.id, movements)) return [];
  const drawn = new Map<string, number>();
  for (const i of madeFrom(batch.id, movements)) drawn.set(i.materialCode, (drawn.get(i.materialCode) ?? 0) + i.qty);
  const out: Shortfall[] = [];
  for (const line of recipe) {
    const mat = MATERIALS.find((x) => x.code === line.code);
    if (!mat) continue;
    const need = round(line.per * (line.basis === "mix" ? batch.volume : batch.unitsMade), mat.unit);
    const short = round(need - (drawn.get(line.code) ?? 0), mat.unit);
    if (short > 0) out.push({ materialCode: line.code, name: mat.name, short, unit: mat.unit });
  }
  return out;
}
