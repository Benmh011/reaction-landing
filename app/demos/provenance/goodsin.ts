// ————————————————————————————————————————————————————————————————
// Provenance — goods-in intake.
//
// Reads a supplier delivery note, collection docket or goods received
// note and turns it into stock movements. Same discipline as the
// questionnaire desk: sniff the format, find the table wherever it sits
// on the page, and queue anything uncertain for a person rather than
// guessing at it.
//
// The rule that matters: a line is only accepted when the material is
// recognised, the quantity parses, and the unit agrees with the
// register. Anything else is held. A stock system that quietly accepts
// what it did not understand is worse than one that asks.
// ————————————————————————————————————————————————————————————————

import { parseCsv } from "./intake";
import { MATERIALS, matchMaterial, type Material, type Unit } from "./stock";

// ————————————————————————— column detection —————————————————————————
//
// Every supplier lays a delivery note out differently. These are the
// header spellings that actually turn up on food-trade paperwork.

type Field =
  | "material"
  | "lot"
  | "qty"
  | "unit"
  | "bestBefore"
  | "tempC"
  | "packSize"
  | "orderRef";

const HEADERS: Record<Field, string[]> = {
  material: ["material", "product", "description", "item", "goods", "commodity", "product description", "item description"],
  lot: ["lot", "batch", "lot no", "lot number", "batch no", "batch number", "batch code", "lot code", "traceability code"],
  qty: ["qty", "quantity", "amount", "delivered", "qty delivered", "quantity delivered", "volume", "weight", "net", "net weight", "litres", "kg", "units"],
  unit: ["unit", "uom", "units", "measure", "unit of measure"],
  bestBefore: ["best before", "bbe", "bb date", "expiry", "expiry date", "use by", "shelf life"],
  tempC: ["temp", "temperature", "temp c", "temp °c", "arrival temp", "product temp", "delivery temp", "°c"],
  packSize: ["pack", "pack size", "packs", "case size"],
  orderRef: ["order", "order no", "po", "po number", "purchase order", "our ref", "your ref"],
};

function normHeader(s: string): string {
  return s.toLowerCase().replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
}

// Every field a header cell could plausibly be, with a score. An exact
// match always beats a substring one; among substrings the longest wins.
//
// Scoring rather than first-match matters more than it sounds. "Product
// Temp °C" contains "product", so a naive first-match hands it to the
// material field, that field is already taken, and the temperature
// column silently disappears — the note parses, looks fine, and quietly
// loses the one value that decides whether a chilled delivery is safe.
function candidates(cell: string): { field: Field; score: number }[] {
  const h = normHeader(cell);
  if (!h) return [];

  const out: { field: Field; score: number }[] = [];
  for (const [field, names] of Object.entries(HEADERS) as [Field, string[]][]) {
    let bestLen = 0;
    let exact = false;
    for (const n of names) {
      if (h === n) {
        exact = true;
        bestLen = Math.max(bestLen, n.length);
      } else if (h.includes(n)) {
        bestLen = Math.max(bestLen, n.length);
      }
    }
    if (bestLen > 0) out.push({ field, score: (exact ? 1000 : 0) + bestLen });
  }
  return out;
}

// The header row is the row with the most confidently mapped columns,
// searched from the top. Delivery notes carry an address block and a
// logo above the table, so row 0 is rarely it.
function findHeaderRow(grid: (string | null)[][]): { row: number; map: Partial<Record<Field, number>> } | null {
  let best: { row: number; map: Partial<Record<Field, number>>; hits: number } | null = null;

  const limit = Math.min(grid.length, 40);
  for (let r = 0; r < limit; r++) {
    const pairs: { col: number; field: Field; score: number }[] = [];
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      for (const cand of candidates(String(cell))) pairs.push({ col: c, ...cand });
    }

    // Strongest claims first; a column and a field are each used once.
    pairs.sort((a, b) => b.score - a.score);
    const map: Partial<Record<Field, number>> = {};
    const usedCol = new Set<number>();
    let hits = 0;
    for (const p of pairs) {
      if (map[p.field] !== undefined || usedCol.has(p.col)) continue;
      map[p.field] = p.col;
      usedCol.add(p.col);
      hits += 1;
    }

    // A real table needs at least a material and a quantity.
    if (map.material !== undefined && map.qty !== undefined && (!best || hits > best.hits)) {
      best = { row: r, map, hits };
    }
  }

  return best ? { row: best.row, map: best.map } : null;
}

// ————————————————————————— value parsing —————————————————————————

// Suppliers write quantities as "1,850", "1850 L", "1850.00", "1 850".
// Pull the number out without losing the decimal.
export function parseQty(raw: string): number | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[^\d.,\-]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(/\s/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

const UNIT_WORDS: Record<string, Unit> = {
  l: "L",
  ltr: "L",
  ltrs: "L",
  litre: "L",
  litres: "L",
  liter: "L",
  liters: "L",
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ea: "units",
  each: "units",
  unit: "units",
  units: "units",
  pcs: "units",
  pieces: "units",
  cs: "units",
  case: "units",
  cases: "units",
};

export function parseUnit(raw: string): Unit | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/[^a-z]/g, "");
  return UNIT_WORDS[s] ?? null;
}

// A temperature can be "-19.4", "-19.4°C", "-19.4 C", "minus 19.4".
export function parseTemp(raw: string): number | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/minus\s*/g, "-");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

// ————————————————————————— the extracted line —————————————————————————

export type LineState = "accepted" | "held" | "exception";

export type GoodsLine = {
  id: string;
  sourceRow: number;
  rawMaterial: string;
  material: Material | null;
  lot: string;
  qty: number | null;
  unit: Unit | null;
  bestBefore?: string;
  tempC?: number | null;
  orderRef?: string;
  state: LineState;
  // Why it is held or flagged, written for the person reviewing it.
  issues: string[];
};

export type GoodsInReport = {
  fileName: string;
  fileKind: "csv" | "xlsx" | "xls" | "xlsm";
  sheetName?: string;
  headerRow: number;
  rowsRead: number;
  accepted: number;
  held: number;
  exceptions: number;
  supplier?: string;
  noteRef?: string;
  deliveryDate?: string;
};

export type GoodsIn = { report: GoodsInReport; lines: GoodsLine[] };

// ————————————————————————— line evaluation —————————————————————————
//
// Deterministic, in a fixed order, so the same note always produces the
// same result. Each rule states its own reason.

// Materials that must never come through the door. The whole site is
// nut, gluten, egg, soya and palm-oil free, and every supplier
// declaration and customer questionnaire answer rests on that being
// true. A single pallet accepted in error undoes the claim.
//
// This screen runs on the raw text from the note, before the register is
// consulted, precisely because a prohibited material will never be on
// the register — which is exactly why "unrecognised" is the wrong way
// for it to surface.
const PROHIBITED: { words: string[]; group: string }[] = [
  { words: ["nut", "nuts", "peanut", "hazelnut", "almond", "cashew", "pistachio", "walnut", "pecan", "macadamia", "praline", "gianduja", "marzipan", "frangipane"], group: "nut" },
  { words: ["wheat", "gluten", "barley", "rye", "semolina", "spelt", "malt extract"], group: "gluten" },
  { words: ["egg", "eggs", "albumen", "egg white", "egg yolk"], group: "egg" },
  { words: ["soya", "soy", "soybean", "soja", "lecithin (soya)", "soya lecithin"], group: "soya" },
  { words: ["palm oil", "palm fat", "palm kernel", "palm olein"], group: "palm oil" },
];

function screenProhibited(raw: string): string | null {
  const s = ` ${raw.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")} `;
  for (const p of PROHIBITED) {
    for (const w of p.words) {
      // Whole-word match, so "coconut" does not read as "nut" and
      // "soya" does not fire on "soy sauce" spelled inside another word.
      if (s.includes(` ${w} `)) return p.group;
    }
  }
  return null;
}

function evaluateLine(line: GoodsLine): GoodsLine {
  const issues: string[] = [];
  let state: LineState = "accepted";

  // Runs first and overrides everything below it.
  const prohibited = screenProhibited(line.rawMaterial);
  if (prohibited) {
    issues.push(
      `STOP — this line reads as a ${prohibited} product. The site is ${prohibited} free and this must not be booked in. Reject the delivery, hold it away from production, and tell the supplier before anything is unloaded.`,
    );
    issues.push(
      `The screen is deliberately broad and will also stop a line described as "${prohibited} free". Confirm what actually arrived before releasing it — an unnecessary stop costs an hour, a missed one costs the claim the business is built on.`,
    );
    return { ...line, state: "exception", issues };
  }

  if (!line.material) {
    issues.push(`"${line.rawMaterial}" is not on the material register — match it to a material or add it.`);
    state = "held";
  }

  if (line.qty === null) {
    issues.push("No quantity could be read from this row.");
    state = "held";
  } else if (line.qty <= 0) {
    issues.push("Quantity is zero or negative — a goods-in line must be positive.");
    state = "held";
  }

  // The unit rule. A note that says kg for a material bought in litres is
  // not converted; it is queried. Silent conversion is how a stock figure
  // stops meaning anything.
  if (line.material && line.unit && line.unit !== line.material.unit) {
    issues.push(
      `Note says ${line.unit}, but ${line.material.name} is held in ${line.material.unit}. Confirm before accepting — nothing is converted automatically.`,
    );
    state = "held";
  }

  if (line.material && !line.unit) {
    // No unit column is common and not itself a problem; the register's
    // canonical unit is assumed and the line says so.
    issues.push(`No unit on the note — taken as ${line.material.unit} from the register.`);
  }

  if (!line.lot) {
    issues.push("No lot or batch code. Traceability depends on this — a recall cannot follow stock without it.");
    state = state === "held" ? "held" : "held";
  }

  // Temperature on arrival is a check, not a note. A cold material
  // arriving warm is an exception even when everything else is right.
  if (line.material?.maxIntakeTempC !== undefined && line.tempC !== undefined && line.tempC !== null) {
    if (line.tempC > line.material.maxIntakeTempC) {
      issues.push(
        `Arrived at ${line.tempC}°C against a ${line.material.maxIntakeTempC}°C limit. Reject or quarantine and record the decision.`,
      );
      state = "exception";
    }
  }

  // An unusually large quantity is worth a second look — a keying error
  // on a delivery note is one of the commonest sources of stock drift.
  if (line.material?.typicalDelivery && line.qty && line.qty > line.material.typicalDelivery * 4) {
    issues.push(
      `${line.qty} is well above the usual ${line.material.typicalDelivery} ${line.material.unit} for this material. Worth checking the note.`,
    );
    if (state === "accepted") state = "held";
  }

  return { ...line, state, issues };
}

// ————————————————————————— header block —————————————————————————
//
// Supplier, note number and date usually sit above the table in a loose
// key/value block rather than in columns.

function scrapeHeaderBlock(grid: (string | null)[][], upTo: number) {
  const out: { supplier?: string; noteRef?: string; deliveryDate?: string } = {};

  for (let r = 0; r < Math.min(upTo, grid.length); r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const h = normHeader(String(cell));
      const next = grid[r][c + 1] ? String(grid[r][c + 1]).trim() : "";
      const inline = String(cell).includes(":") ? String(cell).split(":").slice(1).join(":").trim() : "";
      const value = next || inline;
      if (!value) continue;

      if (!out.supplier && /supplier|from|vendor|sold by|despatched by|dispatched by/.test(h)) out.supplier = value;
      if (!out.noteRef && /delivery note|note no|note number|dn no|docket|advice note|grn/.test(h)) out.noteRef = value;
      if (!out.deliveryDate && /date|delivered|collection date/.test(h) && !/best before|expiry/.test(h)) {
        out.deliveryDate = value;
      }
    }
  }

  return out;
}

// ————————————————————————— grid extraction —————————————————————————

export function extractFromGrid(grid: (string | null)[][], fileName: string, sheetName?: string): GoodsIn | null {
  const found = findHeaderRow(grid);
  if (!found) return null;

  const { row: headerRow, map } = found;
  const block = scrapeHeaderBlock(grid, headerRow);
  const lines: GoodsLine[] = [];

  for (let r = headerRow + 1; r < grid.length; r++) {
    const cellAt = (f: Field): string => {
      const c = map[f];
      if (c === undefined) return "";
      const v = grid[r][c];
      return v === null || v === undefined ? "" : String(v).trim();
    };

    const rawMaterial = cellAt("material");
    const qtyRaw = cellAt("qty");

    // Spacer row inside the table.
    if (!rawMaterial && !qtyRaw) continue;
    if (!rawMaterial) continue;

    // A totals row ends the table. It carries a quantity but no material,
    // and everything below it is signature blocks and small print.
    if (/^(total|totals|subtotal|sub total|carried forward|goods total)/i.test(rawMaterial)) break;

    // Below the table sit "Received by:", terms and conditions and the
    // like — text in the material column with no readable quantity. Once
    // real lines have been read, the first such row is the end of the
    // table rather than a line with a missing quantity.
    if (parseQty(qtyRaw) === null && lines.length > 0) break;

    const base: GoodsLine = {
      id: `gl-${r}`,
      sourceRow: r + 1,
      rawMaterial,
      material: matchMaterial(rawMaterial),
      lot: cellAt("lot"),
      qty: parseQty(qtyRaw),
      unit: parseUnit(cellAt("unit")) ?? unitFromQtyText(qtyRaw),
      bestBefore: cellAt("bestBefore") || undefined,
      tempC: map.tempC !== undefined ? parseTemp(cellAt("tempC")) : undefined,
      orderRef: cellAt("orderRef") || undefined,
      state: "accepted",
      issues: [],
    };

    lines.push(evaluateLine(base));
  }

  if (lines.length === 0) return null;

  const report: GoodsInReport = {
    fileName,
    fileKind: "csv",
    sheetName,
    headerRow: headerRow + 1,
    rowsRead: lines.length,
    accepted: lines.filter((l) => l.state === "accepted").length,
    held: lines.filter((l) => l.state === "held").length,
    exceptions: lines.filter((l) => l.state === "exception").length,
    ...block,
  };

  return { report, lines };
}

// "1,850 L" carries its own unit even with no unit column.
function unitFromQtyText(raw: string): Unit | null {
  if (!raw) return null;
  const m = String(raw).match(/[a-zA-Z]+/);
  return m ? parseUnit(m[0]) : null;
}

// ————————————————————————— file routing —————————————————————————

function sniffKind(name: string, buf: ArrayBuffer): "csv" | "xlsx" | "xls" | "xlsm" | null {
  const lower = name.toLowerCase();
  const bytes = new Uint8Array(buf.slice(0, 8));

  // OOXML is a zip; legacy xls is an OLE compound file.
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf;

  if (isZip) return lower.endsWith(".xlsm") ? "xlsm" : "xlsx";
  if (isOle) return "xls";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return "csv";
  return null;
}

export async function parseGoodsIn(file: File): Promise<GoodsIn> {
  const buf = await file.arrayBuffer();
  const kind = sniffKind(file.name, buf);

  if (!kind) {
    throw new Error(
      "That file isn't a format goods-in reads — delivery notes arrive as .xlsx, .xls, .xlsm or .csv. (PDF intake is on the roadmap.)",
    );
  }

  if (kind === "csv") {
    const { grid } = parseCsv(new TextDecoder().decode(buf));
    const out = extractFromGrid(grid, file.name);
    if (!out) throw new Error(noTableMessage);
    out.report.fileKind = "csv";
    return out;
  }

  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array", cellDates: false, raw: false });

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: null }) as (string | null)[][];
    const out = extractFromGrid(grid, file.name, sheetName);
    if (out) {
      out.report.fileKind = kind;
      return out;
    }
  }

  throw new Error(noTableMessage);
}

const noTableMessage =
  "No delivery lines were found. Goods-in looks for a table with a product or description column and a quantity column — check the note has both, or send the sheet the lines are on.";

// ————————————————————————— register, for the UI —————————————————————————

export function registerSummary() {
  return {
    raw: MATERIALS.filter((m) => m.kind === "raw").length,
    packaging: MATERIALS.filter((m) => m.kind === "packaging").length,
    finished: MATERIALS.filter((m) => m.kind === "finished").length,
  };
}
