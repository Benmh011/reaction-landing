// ————————————————————————————————————————————————————————————————
// A recall exercise as a PDF: the trace pack.
//
// What an auditor is handed after a mock recall. Where the lot came from,
// what it became, who received it, where the rest is, whether it all
// adds up, how long it took, and what was done about anything that did
// not. One builder; the icon that opens it and the button that exports
// it get the same bytes.
// ————————————————————————————————————————————————————————————————

import type { jsPDF } from "jspdf";
import { fmtQty } from "./stock";
import { type Exercise, durationLabel, metTarget, fmtExerciseDate, TARGET_MINS } from "./recall";

const NAVY: [number, number, number] = [20, 33, 58];
const MUTED: [number, number, number] = [111, 116, 130];
const RULE: [number, number, number] = [200, 194, 178];
const RED: [number, number, number] = [194, 47, 78];
const AMBER: [number, number, number] = [163, 119, 42];
const GREEN: [number, number, number] = [22, 122, 91];

const W = 210, H = 297, M = 18;

export function tracePackFilename(ex: Exercise): string {
  const when = new Date(ex.startedTs).toISOString().slice(0, 10);
  return `trace-pack-${ex.origin.lot}-${when}.pdf`;
}

export async function buildTracePack(ex: Exercise): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const t = ex.snapshot;
  let y = M;

  const rule = (yy: number, w = 0.25) => { doc.setDrawColor(...RULE); doc.setLineWidth(w); doc.line(M, yy, W - M, yy); };
  const ensure = (needed: number) => { if (y + needed > H - 22) { doc.addPage(); y = M; } };
  const head = (text: string) => {
    ensure(14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...NAVY);
    doc.text(text, M, y); y += 2.5; rule(y); y += 6;
  };
  const line = (text: string, size = 10, color: [number, number, number] = NAVY, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - M * 2);
    ensure(lines.length * (size * 0.46) + 2);
    doc.text(lines, M, y); y += lines.length * (size * 0.46) + 1.5;
  };
  const kv = (k: string, v: string, color: [number, number, number] = NAVY, bold = false) => {
    ensure(6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(k, M, y);
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setTextColor(...color); doc.text(v, M + 42, y);
    y += 5.5;
  };
  const footer = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(`${ex.id} · generated ${fmtNow()}`, M, H - 11);
      doc.text(`Page ${i} of ${n}`, W - M, H - 11, { align: "right" });
      doc.setFontSize(7.5); doc.text("Powered by Reaction", W / 2, H - 6, { align: "center" });
    }
  };

  // ── masthead ──
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text("Salcombe Dairy", M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("Recall exercise · trace pack", W - M, y, { align: "right" });
  y += 4; rule(y); y += 10;

  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...NAVY);
  const title = t?.originMaterial?.name ?? ex.origin.materialCode;
  const tl = doc.splitTextToSize(title, W - M * 2);
  doc.text(tl, M, y); y += tl.length * 7 + 3;

  const met = metTarget(ex);
  kv("Lot", ex.origin.lot, NAVY, true);
  kv("Exercise", ex.id);
  kv("Run by", ex.by);
  kv("Started", fmtExerciseDate(ex));
  kv("Duration", durationLabel(ex) + (ex.completedTs ? "" : " (in progress)"));
  kv("Target", `Full trace within ${TARGET_MINS / 60} hours, reconciled to 100%`);
  kv("Result", met ? "Target met" : "Target not met", met ? GREEN : RED, true);
  y += 4;

  if (!t) {
    line("The exercise was not completed, so there is no trace to report.", 10, MUTED);
    footer();
    return doc;
  }

  // ── what was traced ──
  head("Scope");
  line(
    t.kind === "raw"
      ? `A raw material lot. Traced forward to ${t.forward.length} ${t.forward.length === 1 ? "batch" : "batches"} made from it, and from there to every location and customer.`
      : `A finished batch. Traced back to ${t.back.length} input ${t.back.length === 1 ? "lot" : "lots"}, and forward to every location and customer.`,
    10, NAVY,
  );
  y += 2;
  const affectedLines = t.affected.map((a) => `${t.reconciliation.find((r) => r.lot.lot === a.lot)?.material?.name ?? a.materialCode} · ${a.lot}`);
  line("Affected lots: " + affectedLines.join("; "), 9.5, MUTED);
  if (t.back.length) {
    line("Inputs (context, not recalled): " + t.back.map((b) => `${b.materialCode} · ${b.lot}`).join("; "), 9.5, MUTED);
  }
  y += 4;

  // ── customers ──
  head(`Customers who received affected product (${t.customers.length})`);
  if (t.dispatches.length === 0) line("None. No affected stock has left the estate.", 10, MUTED);
  for (const d of t.dispatches) {
    ensure(6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text(d.customer, M, y);
    doc.setTextColor(...MUTED); doc.setFontSize(9);
    doc.text(`${d.material?.name ?? d.lot.materialCode} · ${d.lot.lot}${d.ref ? ` · ${d.ref}` : ""}`, M + 62, y);
    doc.setTextColor(...NAVY); doc.setFontSize(10);
    doc.text(fmtQty(d.qty, d.unit), W - M - 24, y, { align: "right" });
    doc.setTextColor(...MUTED); doc.setFontSize(9);
    doc.text(d.at, W - M, y, { align: "right" });
    y += 5.5;
  }
  y += 4;

  // ── where it is ──
  head("Affected stock on hand, by location");
  if (t.onHand.length === 0) line("None on hand.", 10, MUTED);
  for (const b of t.onHand) {
    ensure(6);
    const c = ex.counts[`${b.materialCode}|${b.lot}|${b.locationId}`];
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text(b.location?.name ?? b.locationId, M, y);
    doc.setTextColor(...MUTED); doc.setFontSize(9);
    doc.text(`${b.material?.name ?? b.materialCode} · ${b.lot}${b.location?.holding ? " · on hold" : ""}`, M + 62, y);
    doc.setTextColor(...NAVY); doc.setFontSize(10);
    doc.text(`book ${fmtQty(b.qty, b.unit)}`, W - M - 30, y, { align: "right" });
    if (c === undefined) { doc.setTextColor(...AMBER); doc.text("not counted", W - M, y, { align: "right" }); }
    else if (c !== b.qty) { doc.setTextColor(...RED); doc.setFont("helvetica", "bold"); doc.text(`counted ${fmtQty(c, b.unit)}`, W - M, y, { align: "right" }); }
    else { doc.setTextColor(...GREEN); doc.text(`counted ${fmtQty(c, b.unit)}`, W - M, y, { align: "right" }); }
    y += 5.5;
  }
  y += 4;

  // ── reconciliation ──
  head("Reconciliation");
  const cols = [M, M + 46, M + 66, M + 86, M + 106, M + 124, M + 142, W - M - 14, W - M];
  const heads = ["Lot", "In", "Counted", "On hold", "Dispatched", "Sold", "Used", "Waste", "Result"];
  ensure(10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  heads.forEach((h, i) => doc.text(h, cols[i], y, { align: i === 0 ? "left" : "right" }));
  y += 2; rule(y, 0.15); y += 5;
  for (const r of t.reconciliation) {
    ensure(7);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...NAVY);
    doc.text(r.lot.lot, cols[0], y);
    const vals = [r.in, r.counted, r.onHold, r.dispatched, r.sold, r.consumed, r.waste].map((v) => String(Math.round(v * 10) / 10));
    vals.forEach((v, i) => doc.text(v, cols[i + 1], y, { align: "right" }));
    const ok = r.pct >= 100 && r.uncounted === 0;
    doc.setFont("helvetica", "bold"); doc.setTextColor(...(ok ? GREEN : r.uncounted ? AMBER : RED));
    doc.text(`${r.pct}%`, cols[8], y, { align: "right" });
    y += 5.5;
    if (r.gap !== 0 || r.uncounted) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...(r.uncounted ? AMBER : RED));
      const msg = r.uncounted
        ? `${r.uncounted} location${r.uncounted === 1 ? "" : "s"} not counted — book quantity used.`
        : `${r.gap > 0 ? r.gap : -r.gap} ${r.unit} ${r.gap > 0 ? "unaccounted for" : "more than the book"}.`;
      doc.text(msg, cols[0] + 4, y); y += 5;
    }
  }
  y += 4;

  // ── holds ──
  if (ex.holds.length) {
    head("Stock placed on hold during the exercise");
    for (const h of ex.holds) { line(`${h.qty} ${h.unit} of ${h.lot.lot} from ${h.location}`, 10, NAVY); }
    y += 4;
  }

  // ── findings ──
  head("Findings");
  if (ex.notes) line(ex.notes, 10, NAVY);
  else line("No findings recorded.", 10, MUTED);

  footer();
  return doc;
}

export async function tracePackBlob(ex: Exercise): Promise<Blob> {
  const doc = await buildTracePack(ex);
  return doc.output("blob");
}

function fmtNow(): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
}
