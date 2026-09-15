// ————————————————————————————————————————————————————————————————
// The registers as PDFs.
//
// Three documents an auditor asks for by name: the check log, the shelf
// life position, and what is on hold. Each one takes the same raw source
// the desk reads and derives the document from it, so what is on screen
// and what is filed can never drift apart.
//
// Built in the browser with jsPDF, Helvetica throughout, matching the
// procedure record and trace pack — they go in the same folder and
// should look like they came from the same system.
// ————————————————————————————————————————————————————————————————

import type { jsPDF } from "jspdf";
import {
  boardState,
  exceptions,
  describeBand,
  clockLabel,
  fmtAgo,
  assetById,
  evaluate,
  type Asset,
  type Reading,
} from "./checks";
import {
  balances,
  shelfLife,
  fmtQty,
  FRESHNESS_LABEL,
  REASON_WORD,
  type Movement,
} from "./stock";
import type { GoodsIn, GoodsLine } from "./goodsin";

const NAVY: [number, number, number] = [20, 33, 58];
const MUTED: [number, number, number] = [111, 116, 130];
const RULE: [number, number, number] = [200, 194, 178];
const RED: [number, number, number] = [194, 47, 78];
const AMBER: [number, number, number] = [163, 119, 42];
const GREEN: [number, number, number] = [22, 122, 91];

const W = 210, H = 297, M = 18;

// Helvetica's plus-minus, spelled out so the source stays plain ASCII.
const PM = "\u00b1";

// ————————————————————————— filters —————————————————————————
//
// The desk and the document take the same filter object. That is the
// whole point: the scope sentence printed on the page is derived from
// the same value that decided what went on it, so a document cannot
// claim a coverage it does not have.

export const SITES = ["Island Street", "Salcombe", "Strete", "Bath", "Mobile"] as const;
export const LINES = ["ice cream", "chocolate"] as const;

export type CheckSort = "status" | "site" | "name";
export type CheckFilter = {
  site?: string | null;
  attentionOnly?: boolean;
  sort?: CheckSort;
};

export type StockSort = "date" | "material" | "location";
export type StockFilter = {
  site?: string | null;
  line?: string | null;
  sort?: StockSort;
};

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ————————————————————————— shared furniture —————————————————————————

type Doc = { doc: jsPDF; y: number };

function fmtNow(): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date());
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// Trim to fit a column, measured rather than guessed. splitTextToSize
// wraps, which is wrong inside a fixed-width column: the second line
// lands on top of the next row.
function fit(doc: jsPDF, text: string, maxMm: number): string {
  if (doc.getTextWidth(text) <= maxMm) return text;
  let out = text;
  while (out.length > 1 && doc.getTextWidth(out + "\u2026") > maxMm) {
    out = out.slice(0, -1);
  }
  return out.trimEnd() + "\u2026";
}

function makeHelpers(d: Doc, ref: string) {
  const rule = (yy: number, w = 0.25) => {
    d.doc.setDrawColor(...RULE);
    d.doc.setLineWidth(w);
    d.doc.line(M, yy, W - M, yy);
  };
  const ensure = (needed: number) => {
    if (d.y + needed > H - 22) {
      d.doc.addPage();
      d.y = M;
    }
  };
  const head = (text: string) => {
    ensure(16);
    d.doc.setFont("helvetica", "bold");
    d.doc.setFontSize(11.5);
    d.doc.setTextColor(...NAVY);
    d.doc.text(text, M, d.y);
    d.y += 2.5;
    rule(d.y);
    d.y += 6;
  };
  const line = (
    text: string,
    size = 10,
    color: [number, number, number] = NAVY,
    bold = false,
  ) => {
    d.doc.setFont("helvetica", bold ? "bold" : "normal");
    d.doc.setFontSize(size);
    d.doc.setTextColor(...color);
    const lines = d.doc.splitTextToSize(text, W - M * 2);
    ensure(lines.length * (size * 0.46) + 2);
    d.doc.text(lines, M, d.y);
    d.y += lines.length * (size * 0.46) + 1.5;
  };
  const kv = (
    k: string,
    v: string,
    color: [number, number, number] = NAVY,
    bold = false,
  ) => {
    ensure(6);
    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(10);
    d.doc.setTextColor(...MUTED);
    d.doc.text(k, M, d.y);
    d.doc.setFont("helvetica", bold ? "bold" : "normal");
    d.doc.setTextColor(...color);
    d.doc.text(v, M + 42, d.y);
    d.y += 5.5;
  };
  const footer = () => {
    const n = d.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.doc.setPage(i);
      d.doc.setFont("helvetica", "normal");
      d.doc.setFontSize(8);
      d.doc.setTextColor(...MUTED);
      d.doc.text(`${ref} · generated ${fmtNow()}`, M, H - 11);
      d.doc.text(`Page ${i} of ${n}`, W - M, H - 11, { align: "right" });
      d.doc.setFontSize(7.5);
      d.doc.text("Powered by Reaction", W / 2, H - 6, { align: "center" });
    }
  };
  return { rule, ensure, head, line, kv, footer };
}

async function open(kind: string, title: string): Promise<Doc> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const d: Doc = { doc, y: M };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Salcombe Dairy", M, d.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(kind, W - M, d.y, { align: "right" });
  d.y += 4;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(M, d.y, W - M, d.y);
  d.y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  const tl = doc.splitTextToSize(title, W - M * 2);
  doc.text(tl, M, d.y);
  d.y += tl.length * 7 + 3;

  return d;
}

// Where the document came from, when, and what it covers. The third one
// is the one that matters: an extract that quietly leaves something out
// is worse than no extract at all, so the scope is stated on the face of
// the document rather than left to be inferred from the contents.
function provenance(
  helpers: ReturnType<typeof makeHelpers>,
  register: string,
  scope: string,
) {
  helpers.line(
    `Extracted from the ${register} at ${fmtNow()}, reproduced without re-keying. Covers ${scope}.`,
    8.5,
    MUTED,
  );
}

// A reading as a person would say it. Calibration is a comparison, not a
// measurement, so it reads as one.
function lastLabel(asset: Asset, r?: Reading): string {
  if (!r) return "\u2014";
  const u = asset.band.unit;
  if (asset.kind === "calibration") {
    return r.expected !== undefined ? `${r.value}${u} / ${r.expected}${u}` : `${r.value}${u}`;
  }
  const second = r.value2 !== undefined ? ` / ${r.value2}${asset.band2?.unit ?? ""}` : "";
  return `${r.value}${u}${second}`;
}

// ————————————————————————— check log —————————————————————————

export function checkLogFilename(f: CheckFilter = {}): string {
  const bits = ["check-log"];
  if (f.site) bits.push(slug(f.site));
  if (f.attentionOnly) bits.push("attention");
  bits.push(stamp());
  return bits.join("-") + ".pdf";
}

// What the document covers, in a sentence, derived from the filter that
// produced it. A log narrowed to one site that does not say so is a
// misleading document, so this is not optional furniture.
function checkScope(f: CheckFilter): string {
  const what = f.attentionOnly ? "assets needing attention" : "every monitored asset";
  const where = f.site ? `at ${f.site} only` : "at every site";
  return `${what} ${where}`;
}

// One place decides what a filter selects, so the board on screen and
// the rows in the document cannot disagree.
export function applyCheckFilter<T extends { asset: { site: string; name: string }; status: string }>(
  rows: T[],
  f: CheckFilter,
): T[] {
  const RANK: Record<string, number> = { ok: 0, due: 1, overdue: 2 };
  let out = rows;
  if (f.site) out = out.filter((r) => r.asset.site === f.site);
  if (f.attentionOnly) out = out.filter((r) => r.status !== "ok");
  const sort = f.sort ?? "status";
  return [...out].sort((a, b) => {
    if (sort === "site") {
      return a.asset.site.localeCompare(b.asset.site) || a.asset.name.localeCompare(b.asset.name);
    }
    if (sort === "name") return a.asset.name.localeCompare(b.asset.name);
    return (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0) || a.asset.name.localeCompare(b.asset.name);
  });
}

export async function buildCheckLogPdf(
  readings: Reading[],
  operator: string,
  f: CheckFilter = {},
): Promise<jsPDF> {
  const d = await open("Monitoring record", "Temperature, climate and calibration checks");
  const h = makeHelpers(d, "CHK-LOG");

  const board = applyCheckFilter(boardState(readings), f);
  const inScope = new Set(board.map((b) => b.asset.id));
  const exs = exceptions(readings).filter((e) => inScope.has(e.assetId));
  const shown = readings.filter((r) => inScope.has(r.assetId));
  const breaches = exs.filter((e) => e.breach).length;

  h.kv("Produced by", operator || "—");
  h.kv("Produced at", fmtNow());
  h.kv("Assets monitored", String(board.length));
  h.kv(
    "Exceptions",
    exs.length === 0 ? "None" : `${exs.length}${breaches ? ` (${breaches} in breach)` : ""}`,
    exs.length === 0 ? GREEN : breaches ? RED : AMBER,
    true,
  );
  h.kv("Readings held", String(shown.length));
  d.y += 3;
  provenance(h, "monitoring register", checkScope(f));
  d.y += 4;

  // ── exceptions first: it is the first thing anybody looks for ──
  h.head(`Exceptions (${exs.length})`);
  if (exs.length === 0) {
    h.line(
      f.site
        ? `Every asset at ${f.site} is in spec and no check is overdue.`
        : "Every asset is in spec and no check is overdue.",
      10,
      GREEN,
    );
  }
  for (const e of exs) {
    h.ensure(11);
    const colour = e.breach || e.status === "overdue" ? RED : AMBER;
    d.doc.setFillColor(...colour);
    d.doc.rect(M - 4, d.y - 3.4, 1.2, 8.5, "F");
    d.doc.setFont("helvetica", "bold");
    d.doc.setFontSize(10);
    d.doc.setTextColor(...NAVY);
    d.doc.text(e.assetName, M, d.y);
    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(9);
    d.doc.setTextColor(...MUTED);
    d.doc.text(fit(d.doc, e.site, 60), M + 62, d.y);
    d.doc.text(e.at, W - M, d.y, { align: "right" });
    d.y += 4.6;
    d.doc.setFontSize(9);
    d.doc.setTextColor(...colour);
    const rl = d.doc.splitTextToSize(e.reason, W - M * 2 - 4);
    d.doc.text(rl, M, d.y);
    d.y += rl.length * 4.2 + 3;
  }
  d.y += 4;

  // ── the board ──
  h.head(`${f.attentionOnly ? "Assets needing attention" : "Every asset"} (${board.length})`);
  d.doc.setFontSize(8);
  d.doc.setTextColor(...MUTED);
  d.doc.text("Asset", M, d.y);
  d.doc.text("Specification", M + 60, d.y);
  d.doc.text("Last check", M + 112, d.y);
  d.doc.text("Status", W - M, d.y, { align: "right" });
  d.y += 2;
  h.rule(d.y, 0.15);
  d.y += 5;

  for (const st of board) {
    h.ensure(10);
    const colour =
      st.status === "ok" ? GREEN : st.status === "due" ? AMBER : RED;

    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(9.5);
    d.doc.setTextColor(...NAVY);
    d.doc.text(st.asset.name, M, d.y);

    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    let spec: string;
    if (st.asset.kind === "calibration") {
      spec = `within ${PM}${st.asset.band.max ?? 0}${st.asset.band.unit} of test weight`;
    } else {
      spec = describeBand(st.asset.band);
      if (st.asset.band2) spec += `, ${describeBand(st.asset.band2)} ${st.asset.band2.label}`;
    }
    d.doc.text(fit(d.doc, spec, 50), M + 60, d.y);

    d.doc.setTextColor(...NAVY);
    d.doc.setFontSize(9);
    d.doc.text(fit(d.doc, lastLabel(st.asset, st.last), 38), M + 112, d.y);

    d.doc.setFont("helvetica", "bold");
    d.doc.setTextColor(...colour);
    d.doc.setFontSize(9);
    d.doc.text(
      st.status === "ok" ? "In spec" : st.status === "due" ? "Watch" : "Exception",
      W - M,
      d.y,
      { align: "right" },
    );
    d.y += 4.4;

    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(8);
    d.doc.setTextColor(...MUTED);
    d.doc.text(fit(d.doc, st.asset.site, 56), M, d.y);
    const who = st.last ? `${st.last.by}, ${clockLabel(st.last.minsAgo)} (${fmtAgo(st.last.minsAgo)})` : st.due.reason;
    d.doc.text(fit(d.doc, who, 90), M + 60, d.y);
    d.y += 5;
    h.rule(d.y - 1.8, 0.1);
    d.y += 1.5;
  }
  d.y += 4;

  // ── the readings themselves ──
  h.head(`Readings recorded (${shown.length})`);
  h.line(
    `Every reading held${f.sort === "site" ? ", by site" : f.sort === "name" ? ", by asset" : ", most recent first"}, with the verdict the engine returned at the time.`,
    9,
    MUTED,
  );
  d.y += 3;

  d.doc.setFontSize(8);
  d.doc.setTextColor(...MUTED);
  d.doc.text("When", M, d.y);
  d.doc.text("Asset", M + 26, d.y);
  d.doc.text("Reading", M + 84, d.y);
  d.doc.text("By", M + 116, d.y);
  d.doc.text("Verdict", W - M, d.y, { align: "right" });
  d.y += 2;
  h.rule(d.y, 0.15);
  d.y += 5;

  const ordered = [...shown].sort((a, b) => {
    if (f.sort === "name" || f.sort === "site") {
      const an = assetById(a.assetId), bn = assetById(b.assetId);
      const key = f.sort === "site"
        ? (an?.site ?? "").localeCompare(bn?.site ?? "")
        : 0;
      return key || (an?.name ?? "").localeCompare(bn?.name ?? "") || a.minsAgo - b.minsAgo;
    }
    return a.minsAgo - b.minsAgo;
  });
  for (const r of ordered) {
    const asset = assetById(r.assetId);
    if (!asset) continue;
    const v = evaluate(asset, r);
    h.ensure(8);
    const colour = v.status === "ok" ? GREEN : v.status === "due" ? AMBER : RED;

    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    d.doc.text(clockLabel(r.minsAgo), M, d.y);
    d.doc.setTextColor(...NAVY);
    d.doc.setFontSize(9);
    d.doc.text(fit(d.doc, asset.name, 56), M + 26, d.y);
    d.doc.text(fit(d.doc, lastLabel(asset, r), 30), M + 84, d.y);
    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    d.doc.text(fit(d.doc, `${r.by} (${r.via})`, 38), M + 116, d.y);
    d.doc.setFont("helvetica", "bold");
    d.doc.setTextColor(...colour);
    d.doc.text(v.status === "ok" ? "Pass" : v.status === "due" ? "Watch" : "Fail", W - M, d.y, {
      align: "right",
    });
    d.y += 4.4;

    if (v.status !== "ok" || r.note) {
      d.doc.setFont("helvetica", "normal");
      d.doc.setFontSize(8);
      d.doc.setTextColor(...(v.status === "ok" ? MUTED : colour));
      const txt = v.status !== "ok" ? v.reason : r.note!;
      const tl = d.doc.splitTextToSize(txt, W - M * 2 - 26);
      d.doc.text(tl, M + 26, d.y);
      d.y += tl.length * 3.8 + 1;
    }
    d.y += 1.5;
  }

  // The gap this document cannot close on its own, stated rather than
  // left for an auditor to find.
  d.y += 6;
  h.head("Corrective action");
  h.line(
    exs.length === 0
      ? "No exceptions were open when this was produced, so no corrective action is recorded against it."
      : "Corrective action against the exceptions above is recorded separately and is not held in this system.",
    9.5,
    exs.length === 0 ? MUTED : AMBER,
  );

  h.footer();
  return d.doc;
}

export async function checkLogBlob(
  readings: Reading[],
  operator: string,
  f: CheckFilter = {},
): Promise<Blob> {
  const doc = await buildCheckLogPdf(readings, operator, f);
  return doc.output("blob");
}

// ————————————————————————— shelf life —————————————————————————

export function shelfLifeFilename(f: StockFilter = {}): string {
  const bits = ["shelf-life"];
  if (f.line) bits.push(slug(f.line));
  if (f.site) bits.push(slug(f.site));
  bits.push(stamp());
  return bits.join("-") + ".pdf";
}

function stockScope(f: StockFilter): string {
  const what = f.line ? `every ${f.line} lot held` : "every lot held";
  const where = f.site ? `at ${f.site} only` : "at every location";
  return `${what}, ${where}`;
}

// A material marked "both" belongs to either line, so filtering to ice
// cream must not quietly drop the sugar it shares with chocolate.
export function applyStockFilter<T extends { balance: { location?: { site: string; name: string } | undefined; material?: { name: string; line?: string } | undefined } }>(
  rows: T[],
  f: StockFilter,
): T[] {
  let out = rows;
  if (f.site) out = out.filter((r) => r.balance.location?.site === f.site);
  if (f.line) {
    out = out.filter((r) => {
      const l = r.balance.material?.line;
      return l === f.line || l === "both" || l === undefined;
    });
  }
  if (f.sort === "material") {
    out = [...out].sort((a, b) =>
      (a.balance.material?.name ?? "").localeCompare(b.balance.material?.name ?? ""),
    );
  } else if (f.sort === "location") {
    out = [...out].sort(
      (a, b) =>
        (a.balance.location?.name ?? "").localeCompare(b.balance.location?.name ?? "") ||
        (a.balance.material?.name ?? "").localeCompare(b.balance.material?.name ?? ""),
    );
  }
  return out;
}

export async function buildShelfLifePdf(
  movements: Movement[],
  operator: string,
  f: StockFilter = {},
): Promise<jsPDF> {
  const d = await open("Stock record", "Shelf life position");
  const h = makeHelpers(d, "SL-POS");

  const rows = applyStockFilter(shelfLife(movements), f);
  const expired = rows.filter((r) => r.state === "expired");
  const urgent = rows.filter((r) => r.state === "urgent");
  const unknown = rows.filter((r) => r.state === "unknown");

  h.kv("Produced by", operator || "—");
  h.kv("Produced at", fmtNow());
  h.kv("Lots held", String(rows.length));
  h.kv("Past date", String(expired.length), expired.length ? RED : GREEN, expired.length > 0);
  h.kv("Use this week", String(urgent.length), urgent.length ? AMBER : GREEN, urgent.length > 0);
  h.kv("No date held", String(unknown.length), unknown.length ? AMBER : GREEN, unknown.length > 0);
  d.y += 3;
  provenance(h, "stock register", stockScope(f));
  d.y += 4;

  const orderWord =
    f.sort === "material" ? "by material" : f.sort === "location" ? "by location" : "soonest first";
  h.head(`${f.line ? f.line.charAt(0).toUpperCase() + f.line.slice(1) + " lots" : "Every lot"}, ${orderWord} (${rows.length})`);
  d.doc.setFontSize(8);
  d.doc.setTextColor(...MUTED);
  d.doc.text("Material", M, d.y);
  d.doc.text("Lot", M + 58, d.y);
  d.doc.text("Location", M + 88, d.y);
  d.doc.text("Qty", M + 142, d.y, { align: "right" });
  d.doc.text("Best before", W - M, d.y, { align: "right" });
  d.y += 2;
  h.rule(d.y, 0.15);
  d.y += 5;

  if (rows.length === 0) {
    h.line(
      f.site || f.line
        ? "Nothing held matches this filter. The register itself is not empty."
        : "No stock held.",
      10,
      MUTED,
    );
  }

  for (const r of rows) {
    h.ensure(9);
    const b = r.balance;
    const colour =
      r.state === "expired" ? RED : r.state === "urgent" ? AMBER : r.state === "unknown" ? MUTED : GREEN;

    if (r.state === "expired" || r.state === "urgent") {
      d.doc.setFillColor(...colour);
      d.doc.rect(M - 4, d.y - 3.2, 1.2, 8, "F");
    }

    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(9.5);
    d.doc.setTextColor(...NAVY);
    const name = b.material?.name ?? b.materialCode;
    d.doc.text(fit(d.doc, name, 55), M, d.y);
    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    d.doc.text(fit(d.doc, b.lot, 28), M + 58, d.y);
    const loc = (b.location?.name ?? b.locationId) + (b.location?.holding ? " \u00b7 on hold" : "");
    d.doc.text(fit(d.doc, loc, 50), M + 88, d.y);
    d.doc.setTextColor(...NAVY);
    d.doc.setFontSize(9);
    d.doc.text(fmtQty(b.qty, b.unit), M + 142, d.y, { align: "right" });
    d.doc.setFont("helvetica", "bold");
    d.doc.setTextColor(...colour);
    d.doc.setFontSize(8.5);
    d.doc.text(b.bestBefore ?? "not held", W - M, d.y, { align: "right" });
    d.y += 4.2;

    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(8);
    d.doc.setTextColor(...colour);
    const state =
      r.days === null
        ? FRESHNESS_LABEL[r.state]
        : r.days < 0
          ? `${FRESHNESS_LABEL[r.state]} — ${-r.days} day${-r.days === 1 ? "" : "s"} ago`
          : `${FRESHNESS_LABEL[r.state]} — ${r.days} day${r.days === 1 ? "" : "s"} left`;
    d.doc.text(state, M, d.y);
    d.y += 4.6;
    h.rule(d.y - 1.8, 0.1);
    d.y += 1;
  }

  if (unknown.length) {
    d.y += 5;
    h.head("Lots with no date held");
    h.line(
      `${unknown.length} lot${unknown.length === 1 ? "" : "s"} arrived without a readable best before on the delivery note. The date was not invented, so it is absent here rather than estimated.`,
      9.5,
      AMBER,
    );
  }

  h.footer();
  return d.doc;
}

export async function shelfLifeBlob(
  movements: Movement[],
  operator: string,
  f: StockFilter = {},
): Promise<Blob> {
  const doc = await buildShelfLifePdf(movements, operator, f);
  return doc.output("blob");
}

// ————————————————————————— holds —————————————————————————

export function holdsFilename(): string {
  return `holds-register-${stamp()}.pdf`;
}

export async function buildHoldsPdf(
  movements: Movement[],
  operator: string,
): Promise<jsPDF> {
  const d = await open("Stock record", "Stock on hold");
  const h = makeHelpers(d, "HOLD-REG");

  const held = balances(movements).filter((b) => b.location?.holding);

  h.kv("Produced by", operator || "—");
  h.kv("Produced at", fmtNow());
  h.kv("Lots on hold", String(held.length), held.length ? AMBER : GREEN, true);
  d.y += 3;
  provenance(h, "stock register", "every location that holds stock back from use");
  d.y += 4;

  h.head(`On hold (${held.length})`);
  if (held.length === 0) {
    h.line("Nothing is on hold.", 10, GREEN);
    h.footer();
    return d.doc;
  }

  h.line(
    "Stock physically on site and deliberately not free to use. Each entry carries the movement that placed it there.",
    9,
    MUTED,
  );
  d.y += 3;

  for (const b of held) {
    const mv = movements
      .filter(
        (m) =>
          m.materialCode === b.materialCode &&
          m.lot === b.lot &&
          m.locationId === b.locationId,
      )
      .sort((x, y) => y.ts - x.ts)[0];

    // Measure the whole entry before drawing, so the marker bar runs the
    // full height of what it is marking rather than a fixed guess.
    d.doc.setFontSize(8.5);
    const noteLines = mv?.note ? d.doc.splitTextToSize(mv.note, W - M * 2).length : 0;
    const blockH = 13 + (mv ? 4 : 4) + noteLines * 3.9;
    h.ensure(blockH + 6);

    d.doc.setFillColor(...AMBER);
    d.doc.rect(M - 4, d.y - 3.4, 1.2, blockH, "F");

    d.doc.setFont("helvetica", "bold");
    d.doc.setFontSize(10);
    d.doc.setTextColor(...NAVY);
    const name = b.material?.name ?? b.materialCode;
    d.doc.text(fit(d.doc, name, 110), M, d.y);
    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(9);
    d.doc.setTextColor(...NAVY);
    d.doc.text(fmtQty(b.qty, b.unit), W - M, d.y, { align: "right" });
    d.y += 4.6;

    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    d.doc.text(`Lot ${b.lot}`, M, d.y);
    d.doc.text(b.location?.name ?? b.locationId, M + 62, d.y);
    if (b.bestBefore) d.doc.text(`Best before ${b.bestBefore}`, W - M, d.y, { align: "right" });
    d.y += 4.4;

    if (mv) {
      d.doc.setFontSize(8.5);
      d.doc.setTextColor(...NAVY);
      const why = `${REASON_WORD[mv.reason]} · ${mv.by} · ${mv.at}${mv.ref ? ` · ${mv.ref}` : ""}`;
      d.doc.text(why, M, d.y);
      d.y += 4;
      if (mv.note) {
        d.doc.setTextColor(...MUTED);
        const nl = d.doc.splitTextToSize(mv.note, W - M * 2);
        d.doc.text(nl, M, d.y);
        d.y += nl.length * 3.9;
      }
    } else {
      d.doc.setFontSize(8.5);
      d.doc.setTextColor(...AMBER);
      d.doc.text("No movement found explaining this hold.", M, d.y);
      d.y += 4;
    }

    d.y += 2.5;
    h.rule(d.y - 1.8, 0.1);
    d.y += 2;
  }

  d.y += 5;
  h.head("Release");
  h.line(
    "Nothing leaves hold without a decision recorded against it. Releases are movements on the stock log and appear there, not here.",
    9.5,
    MUTED,
  );

  h.footer();
  return d.doc;
}

export async function holdsBlob(movements: Movement[], operator: string): Promise<Blob> {
  const doc = await buildHoldsPdf(movements, operator);
  return doc.output("blob");
}

// ————————————————————————— goods in —————————————————————————
//
// The delivery check record. More audit weight than the other three:
// supplier, allergen screening, intake temperature and the decision on
// every line that failed, all in one document. This is the record that
// would be asked for first after a supplier complaint, and the one that
// caught the milk now sitting in quarantine.

export function goodsInFilename(g: GoodsIn): string {
  const ref = g.report.noteRef ? slug(g.report.noteRef) : "no-ref";
  return `goods-in-${ref}-${stamp()}.pdf`;
}

function lineColour(l: GoodsLine): [number, number, number] {
  if (l.rejected || l.state === "exception") return RED;
  if (l.quarantine || l.state === "held") return AMBER;
  return GREEN;
}

function lineWord(l: GoodsLine): string {
  if (l.rejected) return "Rejected";
  if (l.quarantine) return "Quarantined";
  if (l.booked) return "Booked in";
  if (l.state === "exception") return "Stopped";
  if (l.state === "held") return "Needs a person";
  return "Accepted";
}

export async function buildGoodsInPdf(
  g: GoodsIn,
  operator: string,
  intoName?: string,
): Promise<jsPDF> {
  const r = g.report;
  const d = await open("Goods received record", r.supplier ?? "Supplier not stated");
  const h = makeHelpers(d, r.noteRef ?? "GOODS-IN");

  const booked = g.lines.filter((l) => l.booked);
  const rejected = g.lines.filter((l) => l.rejected);
  const quarantined = g.lines.filter((l) => l.quarantine);
  const raised = (l: GoodsLine, code: string) =>
    l.issues.some((i) => i.code === code) || (l.resolutions ?? []).some((r) => r.code === code);
  const prohibited = g.lines.filter((l) => raised(l, "prohibited"));
  const tempBreach = g.lines.filter((l) => raised(l, "temp-breach"));
  const unsettled = g.lines.filter((l) => l.state !== "accepted" && !l.rejected && !l.booked);

  h.kv("Delivery note", r.noteRef ?? "not stated");
  h.kv("Delivery date", r.deliveryDate ?? "not stated");
  h.kv("Checked by", operator || "\u2014");
  h.kv("Lines on note", String(g.lines.length));
  h.kv(
    "Booked in",
    booked.length ? `${booked.length}${intoName ? ` to ${intoName}` : ""}` : "None",
    booked.length ? GREEN : MUTED,
    booked.length > 0,
  );
  if (quarantined.length) h.kv("Quarantined", String(quarantined.length), AMBER, true);
  if (rejected.length) h.kv("Rejected", String(rejected.length), RED, true);
  if (unsettled.length) h.kv("Still open", String(unsettled.length), AMBER, true);
  d.y += 3;

  h.line(
    `Read from ${r.fileName}${r.sheetName ? `, sheet ${r.sheetName}` : ""} (${r.fileKind.toUpperCase()}, table from row ${r.headerRow}) without re-keying. Covers every line on this delivery note.`,
    8.5,
    MUTED,
  );
  d.y += 5;

  // ── the allergen screen: the claim the whole site rests on ──
  h.head("Allergen screening");
  h.line(
    "Every line screened against the site's prohibited list \u2014 nut, gluten, egg, soya and palm oil \u2014 on the wording from the supplier's own note, before the material register was consulted.",
    9.5,
    MUTED,
  );
  d.y += 2;
  if (prohibited.length === 0) {
    h.line("No line matched a prohibited material.", 10, GREEN, true);
  } else {
    h.line(
      `${prohibited.length} line${prohibited.length === 1 ? "" : "s"} matched a prohibited material and ${prohibited.length === 1 ? "was" : "were"} stopped at the door.`,
      10,
      RED,
      true,
    );
    for (const l of prohibited) {
      h.line(`\u2022 ${l.rawMaterial}`, 9.5, RED, true);
      const txt = l.issues.find((i) => i.code === "prohibited")?.text;
      if (txt) h.line(txt, 8.5, RED);
      for (const res of (l.resolutions ?? []).filter((r) => r.code === "prohibited")) {
        h.line(`Settled: ${res.action} \u2014 ${res.by}${res.note ? ` \u2014 ${res.note}` : ""}`, 8.5, NAVY);
      }
    }
  }
  d.y += 5;

  // ── intake temperature ──
  if (tempBreach.length) {
    h.head("Intake temperature");
    for (const l of tempBreach) {
      const colour = l.rejected ? RED : AMBER;
      h.line(
        `${l.material?.name ?? l.rawMaterial} \u2014 lot ${l.lot || "not stated"}${l.tempC !== undefined && l.tempC !== null ? `, arrived at ${l.tempC}\u00b0C` : ""}`,
        9.5,
        colour,
        true,
      );
      const txt = l.issues.find((i) => i.code === "temp-breach")?.text;
      if (txt) h.line(txt, 8.5, colour);
      for (const res of (l.resolutions ?? []).filter((r) => r.code === "temp-breach")) {
        h.line(`Settled: ${res.action} \u2014 ${res.by}${res.note ? ` \u2014 ${res.note}` : ""}`, 8.5, NAVY);
      }
    }
    d.y += 5;
  }

  // ── every line ──
  h.head(`Every line (${g.lines.length})`);
  d.doc.setFontSize(8);
  d.doc.setTextColor(...MUTED);
  d.doc.text("Material", M, d.y);
  d.doc.text("Lot", M + 62, d.y);
  d.doc.text("Qty", M + 100, d.y, { align: "right" });
  d.doc.text("Best before", M + 108, d.y);
  d.doc.text("Outcome", W - M, d.y, { align: "right" });
  d.y += 2;
  h.rule(d.y, 0.15);
  d.y += 5;

  for (const l of g.lines) {
    h.ensure(11);
    const colour = lineColour(l);
    if (colour !== GREEN) {
      d.doc.setFillColor(...colour);
      d.doc.rect(M - 4, d.y - 3.2, 1.2, 7.6, "F");
    }

    d.doc.setFont("helvetica", "normal");
    d.doc.setFontSize(9.5);
    d.doc.setTextColor(...NAVY);
    d.doc.text(fit(d.doc, l.material?.name ?? l.rawMaterial, 58), M, d.y);
    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    d.doc.text(fit(d.doc, l.lot || "no lot", 34), M + 62, d.y);
    d.doc.setTextColor(...NAVY);
    d.doc.setFontSize(9);
    d.doc.text(
      l.qty !== null && l.unit ? fmtQty(l.qty, l.unit) : l.qty !== null ? String(l.qty) : "\u2014",
      M + 100,
      d.y,
      { align: "right" },
    );
    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...MUTED);
    d.doc.text(l.bestBefore ?? "not held", M + 108, d.y);
    d.doc.setFont("helvetica", "bold");
    d.doc.setFontSize(8.5);
    d.doc.setTextColor(...colour);
    d.doc.text(lineWord(l), W - M, d.y, { align: "right" });
    d.y += 4.4;

    // The raw wording from the note, kept because the whole point of a
    // goods-in record is what the supplier actually said.
    if (l.material && l.rawMaterial && l.material.name !== l.rawMaterial) {
      d.doc.setFont("helvetica", "normal");
      d.doc.setFontSize(8);
      d.doc.setTextColor(...MUTED);
      d.doc.text(fit(d.doc, `note read: ${l.rawMaterial}`, 90), M, d.y);
      d.y += 3.8;
    }

    for (const iss of l.issues) {
      d.doc.setFont("helvetica", "normal");
      d.doc.setFontSize(8);
      d.doc.setTextColor(...colour);
      const il = d.doc.splitTextToSize(iss.text, W - M * 2 - 4);
      h.ensure(il.length * 3.8 + 2);
      d.doc.text(il, M, d.y);
      d.y += il.length * 3.8;
    }

    for (const res of l.resolutions ?? []) {
      d.doc.setFont("helvetica", "normal");
      d.doc.setFontSize(8);
      d.doc.setTextColor(...NAVY);
      const rl = d.doc.splitTextToSize(
        `Settled: ${res.action} \u2014 ${res.by}${res.note ? ` \u2014 ${res.note}` : ""}`,
        W - M * 2 - 4,
      );
      h.ensure(rl.length * 3.8 + 2);
      d.doc.text(rl, M, d.y);
      d.y += rl.length * 3.8;
    }

    d.y += 2;
    h.rule(d.y - 1.6, 0.1);
    d.y += 1.5;
  }

  // ── anything still open, said plainly ──
  if (unsettled.length) {
    d.y += 4;
    h.head("Open at the time of this record");
    h.line(
      `${unsettled.length} line${unsettled.length === 1 ? "" : "s"} had not been settled or booked when this was produced. The delivery is not fully accepted until ${unsettled.length === 1 ? "it is" : "they are"}.`,
      9.5,
      AMBER,
    );
  }

  h.footer();
  return d.doc;
}

export async function goodsInBlob(
  g: GoodsIn,
  operator: string,
  intoName?: string,
): Promise<Blob> {
  const doc = await buildGoodsInPdf(g, operator, intoName);
  return doc.output("blob");
}

// ————————————————————————— download —————————————————————————
//
// Same mechanics as the procedure record and trace pack, in one place so
// the three new buttons cannot drift from each other.

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
