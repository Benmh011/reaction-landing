// ————————————————————————————————————————————————————————————————
// Reading a pasteurisation chart.
//
// A chart recorder produces a trace: a temperature every few seconds for
// the length of a run. The record a dairy has to keep is three numbers
// out of that trace — what it peaked at, how long it held above the
// critical limit, and whether the divert valve ever opened. Somebody
// reading those off a printout and typing them into a form is exactly
// the manual step goods-in exists to remove, and it fails the same way:
// a mistyped peak is invisible afterwards.
//
// So the desk reads the trace and derives the numbers. The file is the
// evidence; the record is a calculation from it.
//
// CSV and Excel only. A chart exported as PDF is usually a picture of a
// graph rather than a table of readings, and reading a picture needs OCR
// the desk does not do. Better to say so than to half-read it.
// ————————————————————————————————————————————————————————————————

import { PASTEURISATION, type Pasteurisation } from "./production";

export type Sample = {
  at: string;
  seconds: number;
  c: number;
  diverted: boolean;
};

export type ChartAnalysis = {
  peakC: number;
  // Seconds spent at or above the critical limit, on forward flow, in one
  // unbroken run. Two separate thirty-second excursions are not a hold.
  holdSeconds: number;
  holdFrom: string;
  holdTo: string;
  intervalSeconds: number;
  firstAt: string;
  lastAt: string;
  divertSeen: boolean;
  // Time below the limit while product was still going forward. Any of
  // this at all is the thing that matters most on the whole chart.
  belowLimitForwardSeconds: number;
  // Whether the export said anything about the valve at all. Without it,
  // belowLimitForwardSeconds is not measurable and stays at zero rather
  // than counting the warm-up as a breach.
  divertKnown: boolean;
};

export type ChartRead = {
  fileName: string;
  fileKind: "csv" | "xlsx";
  sheetName?: string;
  headerRow: number;
  instrument?: string;
  serial?: string;
  batchCode?: string;
  product?: string;
  date?: string;
  samples: Sample[];
  analysis: ChartAnalysis;
  // Anything a person should read before trusting the numbers.
  notes: string[];
};

// ————————————————————————— reading the file —————————————————————————

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function csvToGrid(text: string): (string | null)[][] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => splitCsvLine(l).map((c) => (c.trim() === "" ? null : c.trim())));
}

// ————————————————————————— finding the table —————————————————————————

const TIME_WORDS = ["time", "timestamp", "clock", "stamp"];
const TEMP_WORDS = ["temp", "temperature", "product temp", "deg", "°c", "degc"];
const DIVERT_WORDS = ["divert", "diversion", "fdv", "valve"];

function norm(v: string | null): string {
  return (v ?? "").toLowerCase().replace(/[^a-z0-9°]/g, "");
}

function findHeader(grid: (string | null)[][]): { row: number; time: number; temp: number; divert: number } | null {
  for (let r = 0; r < Math.min(grid.length, 60); r++) {
    const cells = grid[r] ?? [];
    let time = -1, temp = -1, divert = -1;
    cells.forEach((cell, c) => {
      const n = norm(cell);
      if (!n) return;
      if (time < 0 && TIME_WORDS.some((w) => n.includes(norm(w)))) time = c;
      // Take the first temperature column: on a two-probe chart that is
      // the product temperature, which is the one the limit applies to.
      if (temp < 0 && TEMP_WORDS.some((w) => n.includes(norm(w)))) temp = c;
      if (divert < 0 && DIVERT_WORDS.some((w) => n.includes(norm(w)))) divert = c;
    });
    if (time >= 0 && temp >= 0) return { row: r, time, temp, divert };
  }
  return null;
}

// Key/value pairs above the table: instrument, batch, date and so on.
function scrapeMeta(grid: (string | null)[][], upTo: number) {
  const out: Record<string, string> = {};
  for (let r = 0; r < upTo; r++) {
    const cells = grid[r] ?? [];
    for (let c = 0; c < cells.length - 1; c++) {
      const k = norm(cells[c]);
      const v = cells[c + 1];
      if (!k || !v) continue;
      if (k.includes("instrument") || k.includes("recorder")) out.instrument = v;
      else if (k.includes("serial")) out.serial = v;
      else if (k.includes("batch") || k.includes("lot")) out.batchCode = v;
      else if (k.includes("product") && !k.includes("temp")) out.product = v;
      else if (k.includes("date")) out.date = v;
    }
  }
  return out;
}

function parseClock(v: string | null): number | null {
  if (!v) return null;
  const m = v.trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
}

function parseTemp(v: string | null): number | null {
  if (!v) return null;
  const m = String(v).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseDivert(v: string | null): boolean {
  const n = norm(v);
  if (!n) return false;
  return ["yes", "y", "true", "1", "divert", "diverted", "open"].some((w) => n === w || n.includes(w));
}

// ————————————————————————— the analysis —————————————————————————

export function analyse(samples: Sample[], hasDivertColumn = true): ChartAnalysis {
  if (samples.length === 0) {
    return {
      peakC: 0, holdSeconds: 0, holdFrom: "—", holdTo: "—", intervalSeconds: 0,
      firstAt: "—", lastAt: "—", divertSeen: false, belowLimitForwardSeconds: 0,
      divertKnown: false,
    };
  }

  const diffs: number[] = [];
  for (let i = 1; i < samples.length; i++) diffs.push(samples[i].seconds - samples[i - 1].seconds);
  diffs.sort((a, b) => a - b);
  const intervalSeconds = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0;

  const peakC = Math.max(...samples.map((s) => s.c));

  // Longest unbroken run at or above the limit with the valve forward.
  let best = { from: -1, to: -1, span: 0 };
  let runStart = -1;
  for (let i = 0; i <= samples.length; i++) {
    const inRun = i < samples.length && samples[i].c >= PASTEURISATION.criticalC && !samples[i].diverted;
    if (inRun && runStart < 0) runStart = i;
    if (!inRun && runStart >= 0) {
      const from = runStart;
      const to = i - 1;
      const span = samples[to].seconds - samples[from].seconds;
      if (span > best.span) best = { from, to, span };
      runStart = -1;
    }
  }

  // Product going forward while below the limit. The one number nobody
  // wants to see above zero.
  let belowForward = 0;
  if (hasDivertColumn) {
    for (let i = 1; i < samples.length; i++) {
      const s = samples[i];
      if (s.c < PASTEURISATION.criticalC && !s.diverted) {
        belowForward += s.seconds - samples[i - 1].seconds;
      }
    }
  }

  return {
    peakC: Math.round(peakC * 10) / 10,
    holdSeconds: best.span,
    holdFrom: best.from >= 0 ? samples[best.from].at : "—",
    holdTo: best.to >= 0 ? samples[best.to].at : "—",
    intervalSeconds,
    firstAt: samples[0].at,
    lastAt: samples[samples.length - 1].at,
    divertSeen: samples.some((s) => s.diverted),
    belowLimitForwardSeconds: belowForward,
    divertKnown: hasDivertColumn,
  };
}

// ————————————————————————— the whole read —————————————————————————

const noTableMessage =
  "No trace was found. A chart export needs a table with a time column and a temperature column — check the file has both, or send the sheet the readings are on.";

export function readGrid(
  grid: (string | null)[][],
  fileName: string,
  fileKind: "csv" | "xlsx",
  sheetName?: string,
): ChartRead | null {
  const head = findHeader(grid);
  if (!head) return null;

  const samples: Sample[] = [];
  let dayOffset = 0;
  let prev = -1;
  for (let r = head.row + 1; r < grid.length; r++) {
    const cells = grid[r] ?? [];
    const raw = cells[head.time];
    const t = parseClock(typeof raw === "string" ? raw : raw === null ? null : String(raw));
    const c = parseTemp(cells[head.temp]);
    if (t === null || c === null) continue;
    // A run that crosses midnight would otherwise read as going backwards.
    if (prev >= 0 && t + dayOffset < prev) dayOffset += 86400;
    prev = t + dayOffset;
    samples.push({
      at: String(cells[head.time]).trim(),
      seconds: t + dayOffset,
      c,
      diverted: head.divert >= 0 ? parseDivert(cells[head.divert]) : false,
    });
  }

  if (samples.length < 2) return null;

  const meta = scrapeMeta(grid, head.row);
  const analysis = analyse(samples, head.divert >= 0);

  const notes: string[] = [];
  if (head.divert < 0) {
    notes.push(
      "No divert column in this export, so the trace cannot show whether the valve ever opened. The hold is measured on temperature alone, and time below the limit cannot be judged — the warm-up would look like a breach if it were counted.",
    );
  }
  if (analysis.intervalSeconds > 5) {
    notes.push(
      `Sampled every ${analysis.intervalSeconds}s, so a ${PASTEURISATION.holdSeconds}s hold is measured to within ${analysis.intervalSeconds}s. A faster interval would evidence it more tightly.`,
    );
  }
  if (analysis.belowLimitForwardSeconds > 0) {
    notes.push(
      `${analysis.belowLimitForwardSeconds}s below ${PASTEURISATION.criticalC}°C with the valve forward. Product went through under temperature — this is the finding, not the peak.`,
    );
  }
  if (analysis.holdSeconds === 0) {
    notes.push(`The trace never reaches ${PASTEURISATION.criticalC}°C on forward flow. Nothing on this chart was pasteurised.`);
  }

  return {
    fileName,
    fileKind,
    sheetName,
    headerRow: head.row + 1,
    instrument: meta.instrument,
    serial: meta.serial,
    batchCode: meta.batchCode,
    product: meta.product,
    date: meta.date,
    samples,
    analysis,
    notes,
  };
}

export async function readChart(file: File): Promise<ChartRead> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();

  if (name.endsWith(".pdf")) {
    throw new Error(
      "A chart exported as PDF is usually a picture of the graph rather than a table of readings. Export the trace as CSV or Excel from the recorder instead.",
    );
  }

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const out = readGrid(csvToGrid(new TextDecoder().decode(buf)), file.name, "csv");
    if (!out) throw new Error(noTableMessage);
    return out;
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "array", cellDates: false, raw: false });
    for (const sheetName of wb.SheetNames) {
      const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
        header: 1, blankrows: true, defval: null,
      }) as (string | null)[][];
      const out = readGrid(grid, file.name, "xlsx", sheetName);
      if (out) return out;
    }
    throw new Error(noTableMessage);
  }

  throw new Error(
    "That file isn't a format the desk reads. Chart exports arrive as .csv, .xlsx, .xls or .xlsm.",
  );
}

// The record derived from the trace. Nothing here is typed by a person,
// which is the point.
export function toPasteurisation(read: ChartRead, by: string): Pasteurisation {
  return {
    peakC: read.analysis.peakC,
    holdSeconds: read.analysis.holdSeconds,
    belowLimitForwardSeconds: read.analysis.divertKnown ? read.analysis.belowLimitForwardSeconds : undefined,
    chartRef: read.fileName.replace(/\.[^.]+$/, ""),
    // Only claimable when the export carries a divert column and shows
    // the valve moving. Absent that, it has not been evidenced here.
    divertTested: read.analysis.divertSeen,
    divertTestedBy: read.analysis.divertSeen ? by : undefined,
    at: read.analysis.holdFrom !== "—" ? read.analysis.holdFrom : read.analysis.firstAt,
    by: read.instrument ? `${read.instrument}` : "chart recorder",
    via: "chart recorder",
  };
}
