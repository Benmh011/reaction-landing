// ————————————————————————————————————————————————————————————————
// Sage 50 hand-over.
//
// Sage 50 is a desktop program on an office PC. Writing to it directly
// needs Sage's developer programme, a paid annual licence, plus a
// connector running beside it. This avoids all of that. It gathers the
// stock movements Sage has not yet been given into a numbered batch, and
// hands that batch over as a file Sage 50 can import — or as a sheet laid
// out for typing in by hand. Nothing to license, nothing installed.
//
// What Sage gets is deliberately less than this system holds. Sage 50
// tracks quantity and value per product; it does not track lots, best
// before dates or which shelf something is on. So each batch is totals per
// product, per day, per kind of movement, and the detail — the lots and
// the trace — stays here, where a recall needs it.
//
// Every movement belongs to exactly one batch once handed over, whether or
// not it produced a Sage line. A transfer between sites is "covered" by
// the batch it fell in even though Sage never sees it, so it can never
// turn up later — and nothing is ever entered twice or missed.
// ————————————————————————————————————————————————————————————————

import { MATERIALS, REASON_WORD, type Movement, type MovementReason, type Unit } from "./stock";

export type SageType = "AI" | "AO";

export type SageLine = {
  type: SageType;
  // The product code as it exists in Sage, which is what the import needs.
  sageCode: string;
  materialCode: string;
  name: string;
  date: string; // ddmmyyyy, Sage's import format
  day: string; // yyyy-mm-dd, for sorting and display
  reference: string; // the batch, so every figure in Sage traces back here
  details: string;
  qty: number;
  unit: Unit;
  cost: number; // per unit
  reason: MovementReason;
  movements: number;
};

export type SageSettings = {
  // Our material code -> their Sage product code. Empty until set.
  codes: Record<string, string>;
  // Cost per unit, in pounds. Overrides the placeholder.
  costs: Record<string, number>;
  // Off by default: if sales are invoiced in Sage, Sage has already taken
  // that stock out, and sending it again would count every sale twice.
  includeSales: boolean;
};

export type SageBatch = {
  no: number;
  ref: string;
  at: number;
  by: string;
  includeSales: boolean;
  // Every movement this batch covers, including those Sage never sees.
  ids: string[];
  // Exactly what was handed over, so a re-download matches it to the line
  // even if a code or cost is changed later.
  lines: SageLine[];
};

// Placeholder costs per unit. Invented, so the figures Sage receives are
// not all zero; Salcombe Dairy's real costs replace them.
export const PLACEHOLDER_COST: Record<string, number> = {
  "RM-MILK": 0.45,
  "RM-CREAM": 2.8,
  "RM-COCOA": 9.5,
  "RM-COUV": 11.0,
  "RM-SUGAR": 0.95,
  "RM-GLUC": 1.6,
  "RM-STAB": 14.0,
  "RM-VAN": 85.0,
  "RM-FRUIT": 4.2,
  "PK-TUB2": 0.42,
  "PK-TUB500": 0.18,
  "PK-LID": 0.06,
  "PK-BAR": 0.09,
  "PK-CASE": 0.55,
  "FG-VAN2": 6.8,
  "FG-SALT2": 7.1,
  "FG-SALT5": 1.95,
  "FG-STRAW5": 1.9,
  "FG-HONEY2": 7.2,
  "FG-MINT5": 1.95,
  "FG-CHOC5": 1.95,
  "FG-BAR70": 1.6,
};

// Which movements Sage hears about. Transfers and holds move stock between
// places that are all the same business, so in Sage they net to nothing.
const NEVER: MovementReason[] = ["transfer-in", "transfer-out", "hold"];
const SALES: MovementReason[] = ["sale", "dispatch"];

export function goesToSage(m: Movement, includeSales: boolean): boolean {
  if (NEVER.includes(m.reason)) return false;
  if (SALES.includes(m.reason) && !includeSales) return false;
  return Math.abs(m.qty) > 0.0001 && MATERIALS.some((x) => x.code === m.materialCode);
}

export function costOf(code: string, s: SageSettings): number {
  const c = s.costs[code];
  return typeof c === "number" && Number.isFinite(c) && c >= 0 ? c : PLACEHOLDER_COST[code] ?? 0;
}

export function costIsPlaceholder(code: string, s: SageSettings): boolean {
  return !(typeof s.costs[code] === "number" && Number.isFinite(s.costs[code]));
}

// ————————————————————————— batches —————————————————————————

export function handedOver(batches: SageBatch[]): Set<string> {
  const out = new Set<string>();
  for (const b of batches) for (const id of b.ids) out.add(id);
  return out;
}

// Movements no batch has covered yet.
export function pending(movements: Movement[], batches: SageBatch[]): Movement[] {
  const done = handedOver(batches);
  return movements.filter((m) => !done.has(m.id));
}

export function batchRef(no: number): string {
  return `PV-${String(no).padStart(4, "0")}`;
}

export function nextNumber(batches: SageBatch[]): number {
  return batches.reduce((n, b) => Math.max(n, b.no), 0) + 1;
}

const pad = (n: number) => String(n).padStart(2, "0");
const round2 = (n: number) => Math.round(n * 100) / 100;

// Products that would appear in this batch but have no Sage code yet. The
// batch cannot be handed over until each has one: a line Sage cannot match
// to a product is rejected on import.
export function unmapped(moves: Movement[], s: SageSettings): string[] {
  const out = new Set<string>();
  for (const m of moves) {
    if (!goesToSage(m, s.includeSales)) continue;
    if (!(s.codes[m.materialCode] ?? "").trim()) out.add(m.materialCode);
  }
  return [...out];
}

// The batch's Sage lines: one per product, per day, per kind of movement,
// with ins and outs kept apart rather than netted, so each line still
// reads as something that happened.
export function collate(moves: Movement[], s: SageSettings, ref: string): SageLine[] {
  const acc = new Map<string, SageLine & { refs: Set<string> }>();
  for (const m of moves) {
    if (!goesToSage(m, s.includeSales)) continue;
    const mat = MATERIALS.find((x) => x.code === m.materialCode)!;
    const d = new Date(m.ts);
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const type: SageType = m.qty > 0 ? "AI" : "AO";
    const key = `${m.materialCode}|${day}|${type}|${m.reason}`;
    let line = acc.get(key);
    if (!line) {
      line = {
        type,
        sageCode: (s.codes[m.materialCode] ?? "").trim() || m.materialCode,
        materialCode: m.materialCode,
        name: mat.name,
        date: `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`,
        day,
        reference: ref,
        details: "",
        qty: 0,
        unit: mat.unit,
        cost: costOf(m.materialCode, s),
        reason: m.reason,
        movements: 0,
        refs: new Set(),
      };
      acc.set(key, line);
    }
    line.qty += Math.abs(m.qty);
    line.movements += 1;
    if (m.ref) line.refs.add(m.ref);
  }
  const out: SageLine[] = [];
  for (const { refs, ...l } of acc.values()) {
    const qty = round2(l.qty);
    if (qty <= 0) continue;
    // Sage's details field holds 60 characters. The reason, then the
    // source documents while they fit.
    let details = REASON_WORD[l.reason];
    const list = [...refs];
    if (list.length === 1) details += ` ${list[0]}`;
    else if (list.length > 1) details += ` (${list.length} documents)`;
    out.push({ ...l, qty, details: details.slice(0, 60) });
  }
  return out.sort(
    (a, b) => a.day.localeCompare(b.day) || a.type.localeCompare(b.type) || a.sageCode.localeCompare(b.sageCode),
  );
}

// What was left out of a batch, and why, for saying so on screen.
export function leftOut(moves: Movement[], includeSales: boolean): { transfers: number; holds: number; sales: number } {
  let transfers = 0, holds = 0, sales = 0;
  for (const m of moves) {
    if (m.reason === "transfer-in" || m.reason === "transfer-out") transfers++;
    else if (m.reason === "hold") holds++;
    else if (SALES.includes(m.reason) && !includeSales) sales++;
  }
  return { transfers, holds, sales };
}

export function totals(lines: SageLine[]): { inLines: number; outLines: number; inValue: number; outValue: number } {
  let inLines = 0, outLines = 0, inValue = 0, outValue = 0;
  for (const l of lines) {
    if (l.type === "AI") { inLines++; inValue += l.qty * l.cost; }
    else { outLines++; outValue += l.qty * l.cost; }
  }
  return { inLines, outLines, inValue: round2(inValue), outValue: round2(outValue) };
}

// ————————————————————————— the import file —————————————————————————
//
// Sage 50's stock transaction layout: type, product code, date (ddmmyyyy),
// reference, details, quantity, cost price, sale price. No heading row.
// Fields are quoted when they hold a comma or a quote; the date is quoted
// so a spreadsheet opened on the way cannot turn it into a number.

function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(lines: SageLine[]): string {
  return (
    lines
      .map((l) =>
        [
          l.type,
          csvField(l.sageCode.slice(0, 30)),
          `"${l.date}"`,
          csvField(l.reference.slice(0, 30)),
          csvField(l.details),
          l.qty.toFixed(2),
          l.cost.toFixed(2),
          "",
        ].join(","),
      )
      .join("\r\n") + "\r\n"
  );
}

export function csvFilename(ref: string): string {
  return `sage-stock-${ref}-${new Date().toISOString().slice(0, 10)}.csv`;
}

// ————————————————————————— storage —————————————————————————
//
// In this browser for now, like the rest of the build. Handed-over batches
// are the one thing here that must not be lost, which is part of the case
// for the database.

const SETTINGS_KEY = "salcombe-dairy.sage.settings";
const BATCHES_KEY = "salcombe-dairy.sage.batches";

export const DEFAULT_SETTINGS: SageSettings = { codes: {}, costs: {}, includeSales: false };

export function loadSettings(): SageSettings {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Partial<SageSettings>;
    return {
      codes: p.codes && typeof p.codes === "object" ? p.codes : {},
      costs: p.costs && typeof p.costs === "object" ? p.costs : {},
      includeSales: p.includeSales === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: SageSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: settings last until the page closes.
  }
}

export function loadBatches(): SageBatch[] {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(BATCHES_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? (p as SageBatch[]).filter((b) => b && Array.isArray(b.ids) && Array.isArray(b.lines)) : [];
  } catch {
    return [];
  }
}

export function saveBatches(b: SageBatch[]): void {
  try {
    window.localStorage.setItem(BATCHES_KEY, JSON.stringify(b));
  } catch {
    // Storage blocked: the batch lasts until the page closes.
  }
}
