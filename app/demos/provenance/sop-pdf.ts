// ————————————————————————————————————————————————————————————————
// A procedure run as a PDF.
//
// One function builds it. The inline icon that opens the record and the
// button that exports it both call this and get the same bytes, so what
// is viewed and what is filed can never differ.
//
// Built in the browser with jsPDF. Helvetica throughout: it is a record
// for an auditor's file, and a built-in face means it renders the same
// everywhere without carrying a font along.
// ————————————————————————————————————————————————————————————————

import type { jsPDF } from "jspdf";
import { type Run, type Sop, stepById, fmtRunDate } from "./sop";

const NAVY: [number, number, number] = [20, 33, 58];
const MUTED: [number, number, number] = [111, 116, 130];
const RULE: [number, number, number] = [200, 194, 178];
const RED: [number, number, number] = [194, 47, 78];
const AMBER: [number, number, number] = [163, 119, 42];
const GREEN: [number, number, number] = [22, 122, 91];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const COL_ANSWER = 122; // x where the answer column starts

export function runFilename(sop: Sop, run: Run): string {
  const when = fmtRunDate(run).replace(/[^0-9A-Za-z]+/g, "-").replace(/-+$/, "");
  return `${sop.id}-${when}-${run.by.replace(/[^A-Za-z0-9]+/g, "")}.pdf`;
}

export async function buildRunPdf(sop: Sop, run: Run): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = MARGIN;

  const rule = (yy: number) => {
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, yy, PAGE_W - MARGIN, yy);
  };

  const footer = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`${sop.id} · generated ${fmtNow()}`, MARGIN, PAGE_H - 11);
      doc.text(`Page ${i} of ${n}`, PAGE_W - MARGIN, PAGE_H - 11, { align: "right" });
      doc.setFontSize(7.5);
      doc.text("Powered by Reaction", PAGE_W / 2, PAGE_H - 6, { align: "center" });
    }
  };

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - 22) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── masthead ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Salcombe Dairy", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Procedure record", PAGE_W - MARGIN, y, { align: "right" });
  y += 4;
  rule(y);
  y += 10;

  // ── title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  const titleLines = doc.splitTextToSize(sop.name, PAGE_W - MARGIN * 2);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 7 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(`${sop.id}  ·  ${sop.reference}`, MARGIN, y);
  y += 7;

  // ── run facts ──
  const outcomeColor = run.outcome === "complete" ? GREEN : run.outcome === "stopped" ? RED : AMBER;
  const facts: [string, string][] = [
    ["Carried out by", run.by],
    ["Started", `${fmtRunDate(run)}, ${run.startedAt}`],
    ["Outcome", run.outcome === "complete" ? "Complete" : run.outcome === "stopped" ? "Stopped" : "In progress"],
    ["Steps recorded", `${run.answers.length} of ${sop.steps.length}`],
  ];
  doc.setFontSize(10);
  for (const [k, v] of facts) {
    doc.setTextColor(...MUTED);
    doc.text(k, MARGIN, y);
    doc.setTextColor(...(k === "Outcome" ? outcomeColor : NAVY));
    doc.setFont("helvetica", k === "Outcome" ? "bold" : "normal");
    doc.text(v, MARGIN + 34, y);
    doc.setFont("helvetica", "normal");
    y += 5.5;
  }
  y += 3;

  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const purpose = doc.splitTextToSize(sop.purpose, PAGE_W - MARGIN * 2);
  doc.text(purpose, MARGIN, y);
  y += purpose.length * 4.4 + 6;

  rule(y);
  y += 7;

  // ── column heads ──
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Step", MARGIN, y);
  doc.text("Answer", COL_ANSWER, y);
  doc.text("Time", PAGE_W - MARGIN, y, { align: "right" });
  y += 3;
  rule(y);
  y += 6;

  // ── the steps ──
  run.answers.forEach((a, i) => {
    const step = stepById(sop, a.stepId);
    const promptLines = doc.splitTextToSize(`${i + 1}.  ${step?.prompt ?? a.stepId}`, COL_ANSWER - MARGIN - 18);
    const answerLines = doc.splitTextToSize(a.value, PAGE_W - MARGIN - COL_ANSWER - 16);
    const flagLines = a.flag ? doc.splitTextToSize(a.flag, PAGE_W - MARGIN - COL_ANSWER - 2) : [];
    const rows = Math.max(promptLines.length, answerLines.length);
    const height = rows * 4.6 + (flagLines.length ? flagLines.length * 4.2 + 2 : 0) + 5;
    ensure(height);

    // A failed step gets a red bar down its left edge, a flagged one amber.
    if (!a.passed || a.flag) {
      doc.setFillColor(...(!a.passed ? RED : AMBER));
      doc.rect(MARGIN - 4, y - 3.6, 1.2, height - 3, "F");
    }

    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "normal");
    doc.text(promptLines, MARGIN, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(a.passed ? NAVY : RED));
    doc.text(answerLines, COL_ANSWER, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(a.at, PAGE_W - MARGIN, y, { align: "right" });

    let yy = y + rows * 4.6;
    if (!a.passed) {
      doc.setFontSize(8.5);
      doc.setTextColor(...RED);
      doc.text("Did not pass", COL_ANSWER, yy);
      yy += 4.2;
    }
    if (flagLines.length) {
      doc.setFontSize(8.5);
      doc.setTextColor(...AMBER);
      doc.text(flagLines, COL_ANSWER, yy);
      yy += flagLines.length * 4.2;
    }
    y = yy + 4;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y - 2.5, PAGE_W - MARGIN, y - 2.5);
    y += 1.5;
  });

  // ── how it ended ──
  y += 4;
  if (run.outcome === "stopped") {
    const lines = doc.splitTextToSize(run.stopAction ?? "Run stopped.", PAGE_W - MARGIN * 2 - 8);
    ensure(lines.length * 4.6 + 16);
    doc.setFillColor(...RED);
    doc.rect(MARGIN - 4, y - 4, 1.2, lines.length * 4.6 + 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...RED);
    doc.text("Stopped", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.6 + 2;
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Stopped at step ${run.answers.length} of ${sop.steps.length}. To be started again from the beginning once the action is done.`, MARGIN, y);
  } else if (run.outcome === "complete") {
    ensure(20);
    doc.setFillColor(...GREEN);
    doc.rect(MARGIN - 4, y - 4, 1.2, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GREEN);
    doc.text("Complete", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    const flagged = run.answers.some((a) => a.flag);
    doc.text(
      `Every step passed${flagged ? ", with notes for a supervisor to see" : ""}. Recorded against ${run.by}.`,
      MARGIN,
      y,
    );
  }

  footer();
  return doc;
}

export async function runPdfBlob(sop: Sop, run: Run): Promise<Blob> {
  const doc = await buildRunPdf(sop, run);
  return doc.output("blob");
}

function fmtNow(): string {
  const d = new Date();
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}
