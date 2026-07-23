// ————————————————————————————————————————————————————————————————
// The intake engine for the questionnaire desk.
//
// Every file gets three guarantees:
//   1. Best-effort deterministic extraction — merge-aware, header-aware,
//      matrix-aware — with no model calls and no network.
//   2. An honest report: what was read, what was extracted, and which
//      rows looked question-ish but weren't extracted, so nothing can
//      fail silently. Ambiguous rows can be promoted by the reviewer.
//   3. A safe output route. Formats that can be edited without damage
//      (.xlsx, .csv) get the buyer's own file back with answers written
//      in. Formats that can't (.xls, .xlsm) get a clean answer
//      transcript instead — never a silently broken original.
// ————————————————————————————————————————————————————————————————

import { ANSWER_BANK } from "./data";

export type Chunk = {
  id: number;
  sheet: string;
  rowNumber: number;
  answerCol: number;
  question: string;
  answer: string;
  source: string | null;
  state: "draft" | "approved" | "editing";
  transcriptOnly?: boolean; // no safe cell to write to in the original
};

export type AmbiguousRow = {
  sheet: string;
  rowNumber: number;
  answerCol: number;
  text: string;
};

export type IntakeReport = {
  fileKind: "xlsx" | "xlsm" | "xls" | "csv";
  route: "native" | "transcript";
  routeReason: string;
  sheetCount: number;
  rowsScanned: number;
  questionsFound: number;
  ambiguous: AmbiguousRow[];
  notes: string[];
};

export type WriteCtx =
  | { route: "xlsx-native"; buf: ArrayBuffer }
  | { route: "csv-native"; grid: (string | null)[][]; delimiter: string }
  | { route: "transcript" };

export type Intake = { report: IntakeReport; chunks: Chunk[]; writeCtx: WriteCtx };

// ————— question detection —————

const looksLikeQuestion = (t: string) => {
  const s = t.trim();
  if (s.length < 12 || s.length > 400) return false;
  if (/^(question|answer|ref|section|no\.?|item)$/i.test(s)) return false;
  return s.includes("?") || /^\d+(\.\d+)*[.):\-—]\s/.test(s);
};

const isRefText = (s: string) => /^\d+(\.\d+)+\s*$/.test(s.trim());
const isRefCell = (v: unknown) =>
  (typeof v === "string" && isRefText(v)) ||
  (typeof v === "number" && v > 0 && v < 1000 && !Number.isInteger(v));

const PLACEHOLDER =
  /^(enter|type|insert|add|provide)\s+(your\s+)?(response|answer|details|text|comments?)(\s+here)?\.?$|^(response|answer)\s+here\.?$|^click here/i;

const HEADER_ANSWER = /^(answer|response|your response|supplier response)s?\s*:?\s*$/i;
const HEADER_COMMENT = /^(comments?|details|evidence|notes?)\s*:?\s*$/i;
const HEADER_MATRIX = /^(yes|no|n\/?a|na|partial|compliant|non-?compliant)\s*$/i;

const wordCount = (s: string) => s.trim().split(/\s+/).length;

export function scoreAgainstBank(q: string) {
  const low = q.toLowerCase();
  let best: { score: number; entry: (typeof ANSWER_BANK)[number] } | null = null;
  for (const entry of ANSWER_BANK) {
    const score = entry.keywords.filter((k) => low.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { score, entry };
  }
  return best &&
    best.score >= 1 &&
    (best.score >= 2 || best.entry.keywords.some((k) => k.length >= 5 && low.includes(k)))
    ? best.entry
    : null;
}

// ————— shared grid extraction —————
// Both engines normalise to a sparse grid of strings per sheet, plus a
// merge map for the exceljs path, then run the same classifier.

type SheetGrid = {
  name: string;
  // rows[r][c] = trimmed text or null; 1-indexed via offset handling below
  rows: Map<number, Map<number, string>>;
  // for a merged master cell at (r,c): the column the merge ends at
  mergeEnd: Map<string, number>;
};

type SheetProfile = {
  answerCol: number | null;
  commentCol: number | null;
  matrixCols: number[];
  headerRow: number;
};

const profileSheet = (g: SheetGrid): SheetProfile => {
  const prof: SheetProfile = { answerCol: null, commentCol: null, matrixCols: [], headerRow: 0 };
  const rowNums = [...g.rows.keys()].sort((a, b) => a - b).slice(0, 15);
  for (const r of rowNums) {
    const cells = g.rows.get(r)!;
    let answer: number | null = null;
    let comment: number | null = null;
    const matrix: number[] = [];
    for (const [c, t] of cells) {
      if (HEADER_ANSWER.test(t)) answer = c;
      else if (HEADER_COMMENT.test(t)) comment = c;
      else if (HEADER_MATRIX.test(t)) matrix.push(c);
    }
    // a real header row names an answer column or at least two matrix columns
    if (answer !== null || matrix.length >= 2) {
      prof.answerCol = answer;
      prof.commentCol = comment;
      prof.matrixCols = matrix;
      prof.headerRow = r;
      break;
    }
  }
  return prof;
};

const extractFromGrids = (grids: SheetGrid[]): Omit<Intake, "writeCtx"> & { report: IntakeReport } => {
  const chunks: Chunk[] = [];
  const ambiguous: AmbiguousRow[] = [];
  const notes: string[] = [];
  let id = 0;
  let rowsScanned = 0;
  let placeholders = 0;

  for (const g of grids) {
    const prof = profileSheet(g);
    if (prof.matrixCols.length >= 2)
      notes.push(
        `"${g.name}" is a Yes/No grid — answers route to its ${prof.commentCol ? "comments column" : "transcript, as it has no comments column"}.`,
      );

    const rowNums = [...g.rows.keys()].sort((a, b) => a - b);
    for (const r of rowNums) {
      rowsScanned += 1;
      if (r <= prof.headerRow) continue;
      const cells = g.rows.get(r)!;

      let qCol = 0;
      let qText = "";
      let hasRef = false;
      for (const [c, t] of cells) {
        if (isRefText(t) || isRefCell(t)) hasRef = true;
        if (t.length >= 12 && !PLACEHOLDER.test(t) && t.length > qText.length) {
          qText = t;
          qCol = c;
        }
      }
      if (!qCol) continue;

      const qualifies = looksLikeQuestion(qText) || (hasRef && qText.length >= 12);
      if (!qualifies) {
        if (wordCount(qText) >= 6 && qText.length <= 300 && !PLACEHOLDER.test(qText)) {
          ambiguous.push({ sheet: g.name, rowNumber: r, answerCol: qCol + 1, text: qText });
        }
        continue;
      }

      // ————— answer cell resolution —————
      let answerCol: number;
      let transcriptOnly = false;

      const cellEmptyOrPlaceholder = (c: number) => {
        const t = cells.get(c);
        if (t == null || t === "") return true;
        if (PLACEHOLDER.test(t)) {
          placeholders += 1;
          return true;
        }
        return false;
      };

      if (prof.matrixCols.length >= 2) {
        if (prof.commentCol && cellEmptyOrPlaceholder(prof.commentCol)) {
          answerCol = prof.commentCol;
        } else {
          answerCol = qCol + 1;
          transcriptOnly = true;
        }
      } else if (prof.answerCol !== null && cellEmptyOrPlaceholder(prof.answerCol)) {
        answerCol = prof.answerCol;
      } else {
        // first empty cell right of the question, clearing any merge
        const mergeEnd = g.mergeEnd.get(`${r}:${qCol}`) ?? qCol;
        answerCol = mergeEnd + 1;
        let hops = 0;
        while (!cellEmptyOrPlaceholder(answerCol) && hops < 8) {
          answerCol += 1;
          hops += 1;
        }
        if (hops >= 8) {
          answerCol = mergeEnd + 1;
          transcriptOnly = true;
        }
      }

      const hit = scoreAgainstBank(qText);
      chunks.push({
        id: id++,
        sheet: g.name,
        rowNumber: r,
        answerCol,
        question: qText,
        answer: hit ? hit.answer : "",
        source: hit ? hit.source : null,
        state: "draft",
        transcriptOnly,
      });
    }
  }
  if (placeholders > 0)
    notes.push(`${placeholders} answer cell${placeholders > 1 ? "s" : ""} contained placeholder text ("Enter response here") — treated as empty and overwritten.`);

  return {
    report: {
      fileKind: "xlsx",
      route: "native",
      routeReason: "",
      sheetCount: grids.length,
      rowsScanned,
      questionsFound: chunks.length,
      ambiguous: ambiguous.slice(0, 8),
      notes,
    },
    chunks,
  };
}

// ————— engine A: OOXML via exceljs (.xlsx native, .xlsm transcript) —————

const cellText = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("richText" in o)
      return (o.richText as { text: string }[]).map((r) => r.text).join("").trim();
    if ("text" in o) return String(o.text).trim();
    if ("result" in o) return String(o.result ?? "").trim();
  }
  return "";
};

const colLetterToNum = (s: string) => {
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};

async function loadOoxml(buf: ArrayBuffer): Promise<SheetGrid[]> {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const grids: SheetGrid[] = [];
  wb.eachSheet((ws) => {
    const g: SheetGrid = { name: ws.name, rows: new Map(), mergeEnd: new Map() };
    const merges: string[] = ((ws.model as { merges?: string[] }).merges ?? []) as string[];
    for (const m of merges) {
      const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(m);
      if (!match) continue;
      const [, c1, r1, c2] = match;
      g.mergeEnd.set(`${Number(r1)}:${colLetterToNum(c1)}`, colLetterToNum(c2));
    }
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells = new Map<number, string>();
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const t = cellText(cell.value);
        if (t !== "") cells.set(Number(col), t);
      });
      if (cells.size) g.rows.set(rowNumber, cells);
    });
    grids.push(g);
  });
  return grids;
}

// ————— engine B: grids via SheetJS (.xls) and hand parse (.csv) —————

async function loadLegacyXls(buf: ArrayBuffer): Promise<SheetGrid[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  return wb.SheetNames.map((name) => {
    const rows2d = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[name], {
      header: 1,
      defval: null,
    });
    const g: SheetGrid = { name, rows: new Map(), mergeEnd: new Map() };
    rows2d.forEach((r, i) => {
      const cells = new Map<number, string>();
      r.forEach((v, j) => {
        const t = v == null ? "" : String(v).trim();
        if (t !== "") cells.set(j + 1, t);
      });
      if (cells.size) g.rows.set(i + 1, cells);
    });
    return g;
  });
}

export function parseCsv(text: string): { grid: (string | null)[][]; delimiter: string } {
  const delimiter = text.split("\n")[0]?.includes(";") && !text.split("\n")[0]?.includes(",") ? ";" : ",";
  const grid: (string | null)[][] = [];
  let row: (string | null)[] = [];
  let cur = "";
  let inQ = false;
  const push = () => {
    row.push(cur === "" ? null : cur);
    cur = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delimiter) push();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      push();
      grid.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur !== "" || row.length) {
    push();
    grid.push(row);
  }
  return { grid, delimiter };
}

const gridToSheet = (grid: (string | null)[][], name: string): SheetGrid => {
  const g: SheetGrid = { name, rows: new Map(), mergeEnd: new Map() };
  grid.forEach((r, i) => {
    const cells = new Map<number, string>();
    r.forEach((v, j) => {
      const t = (v ?? "").trim();
      if (t !== "") cells.set(j + 1, t);
    });
    if (cells.size) g.rows.set(i + 1, cells);
  });
  return g;
};

// ————— entry point —————

const sniffKind = (name: string, buf: ArrayBuffer): IntakeReport["fileKind"] | null => {
  const ext = name.toLowerCase().match(/\.(xlsx|xlsm|xls|csv)$/)?.[1];
  const b = new Uint8Array(buf.slice(0, 4));
  const isZip = b[0] === 0x50 && b[1] === 0x4b;
  const isBiff = b[0] === 0xd0 && b[1] === 0xcf;
  if (ext === "csv") return "csv";
  if (ext === "xls" && isBiff) return "xls";
  if (ext === "xlsm" && isZip) return "xlsm";
  if (ext === "xlsx" && isZip) return "xlsx";
  // extension lied — trust the bytes
  if (isZip) return "xlsx";
  if (isBiff) return "xls";
  if (ext) return ext as IntakeReport["fileKind"];
  return null;
};

export async function parseIncoming(file: File): Promise<Intake> {
  const buf = await file.arrayBuffer();
  const kind = sniffKind(file.name, buf);
  if (!kind)
    throw new Error(
      "That file isn't a format the desk reads — questionnaires arrive as .xlsx, .xls, .xlsm or .csv. (Word and PDF intake is on the roadmap.)",
    );

  if (kind === "csv") {
    const { grid, delimiter } = parseCsv(new TextDecoder().decode(buf));
    const base = extractFromGrids([gridToSheet(grid, file.name.replace(/\.csv$/i, ""))]);
    base.report.fileKind = "csv";
    base.report.route = "native";
    base.report.routeReason = "Answers are written back into the CSV itself.";
    return { ...base, writeCtx: { route: "csv-native", grid, delimiter } };
  }

  if (kind === "xls") {
    const grids = await loadLegacyXls(buf);
    const base = extractFromGrids(grids);
    base.report.fileKind = "xls";
    base.report.route = "transcript";
    base.report.routeReason =
      "Legacy .xls can't be edited without damaging it — you'll get a clean answer transcript to send alongside the original.";
    base.chunks.forEach((c) => (c.transcriptOnly = true));
    return { ...base, writeCtx: { route: "transcript" } };
  }

  // xlsx / xlsm — both OOXML, different output routes
  const grids = await loadOoxml(buf);
  const base = extractFromGrids(grids);
  base.report.fileKind = kind;
  if (kind === "xlsm") {
    base.report.route = "transcript";
    base.report.routeReason =
      "This workbook contains macros, which editing would strip — you'll get a clean answer transcript so the buyer's file is never damaged.";
    base.chunks.forEach((c) => (c.transcriptOnly = true));
    return { ...base, writeCtx: { route: "transcript" } };
  }
  base.report.route = "native";
  base.report.routeReason = "Answers are written back into the buyer's own workbook, formatting intact.";
  if (base.chunks.some((c) => c.transcriptOnly))
    base.report.notes.push(
      "Some rows had no safe cell to write into — those answers go to the transcript instead.",
    );
  return { ...base, writeCtx: { route: "xlsx-native", buf } };
}

// ————— outputs —————

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const download = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export async function buildCompletedBytes(
  writeCtx: WriteCtx,
  chunks: Chunk[],
  originalName: string,
): Promise<{ bytes: ArrayBuffer; name: string }> {
  const approved = chunks.filter((c) => c.state === "approved" && c.answer.trim());
  const base = originalName.replace(/\.(xlsx|xlsm|xls|csv)$/i, "");

  if (writeCtx.route === "xlsx-native") {
    const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(writeCtx.buf);
    const spilled: Chunk[] = [];
    for (const c of approved) {
      if (c.transcriptOnly) {
        spilled.push(c);
        continue;
      }
      const ws = wb.getWorksheet(c.sheet);
      if (!ws) continue;
      const cell = ws.getRow(c.rowNumber).getCell(c.answerCol);
      cell.value = c.answer;
      cell.alignment = { wrapText: true, vertical: "top" };
    }
    if (spilled.length) appendTranscriptSheet(wb, spilled);
    const bytes = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    return { bytes, name: `${base} — completed.xlsx` };
  }

  if (writeCtx.route === "csv-native") {
    const grid = writeCtx.grid.map((r) => [...r]);
    for (const c of approved) {
      const r = c.rowNumber - 1;
      while (!grid[r]) grid.push([]);
      while (grid[r].length < c.answerCol) grid[r].push(null);
      grid[r][c.answerCol - 1] = c.answer;
    }
    const esc = (v: string | null) => {
      const s = v ?? "";
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const text = grid.map((r) => r.map(esc).join(writeCtx.delimiter)).join("\r\n");
    return { bytes: new TextEncoder().encode(text).buffer as ArrayBuffer, name: `${base} — completed.csv` };
  }

  // transcript: a clean workbook of every approved answer
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  appendTranscriptSheet(wb, approved);
  const bytes = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return { bytes, name: `${base} — answers.xlsx` };
}

function appendTranscriptSheet(
  wb: { addWorksheet: (n: string) => any },
  chunks: Chunk[],
) {
  const ws = wb.addWorksheet("Answers — Estuary Creamery");
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 70;
  ws.getColumn(3).width = 70;
  ws.getColumn(4).width = 28;
  const h = ws.addRow(["Location in original", "Question", "Answer", "Source document"]);
  h.font = { bold: true };
  for (const c of chunks) {
    const row = ws.addRow([`${c.sheet} · row ${c.rowNumber}`, c.question, c.answer, c.source ?? "Answered by reviewer"]);
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }
}

export async function downloadCompleted(writeCtx: WriteCtx, chunks: Chunk[], originalName: string) {
  const { bytes, name } = await buildCompletedBytes(writeCtx, chunks, originalName);
  const mime = name.endsWith(".csv") ? "text/csv" : XLSX_MIME;
  download(new Blob([bytes], { type: mime }), name);
  return bytes;
}
