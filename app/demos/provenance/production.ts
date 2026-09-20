// ————————————————————————————————————————————————————————————————
// Production: what was made, and the evidence that it was made safely.
//
// A batch is the unit. Everything else hangs off it — the pasteurisation
// that made it safe, the metal detection that proved nothing got in, the
// fill weights that keep it legal to sell. Those are not three separate
// logs that happen to mention the same code; they are one record.
//
// Every verdict here is derived from the reading against the limit. None
// is stored, because a stored pass is a claim and a derived one is a
// calculation. If somebody changes a critical limit, yesterday's records
// re-judge themselves and say so.
// ————————————————————————————————————————————————————————————————

import type { Status } from "./data";

// ————————————————————————— limits —————————————————————————

// The heat treatment that makes ice cream mix safe. 79.4°C for 15
// seconds is the recognised continuous equivalent for mix; the site runs
// at 85°C, which is where it wants to be rather than where it must be.
// Judging against the target rather than the limit would fail a batch
// that was perfectly safe, so both are held and both are shown.
export const PASTEURISATION = {
  criticalC: 79.4,
  targetC: 85.0,
  holdSeconds: 15,
  // A divert valve that has not been proved this morning makes every
  // batch after it unevidenced, whatever the chart says.
  divertTestRequired: true,
};

// Challenge pieces the detector has to find and reject, every run.
export const METAL_LIMITS = { fe: 1.5, nonFe: 2.0, stainless: 2.5 };

// ————————————————————————— shapes —————————————————————————

export type Pasteurisation = {
  // Highest temperature reached on the hold, and how long it held.
  peakC: number;
  holdSeconds: number;
  chartRef: string;
  // Seconds of product going forward while below the critical limit,
  // where the chart is able to say. A peak and a hold can both look fine
  // while this is non-zero, and this is the one that matters.
  belowLimitForwardSeconds?: number;
  divertTested: boolean;
  divertTestedBy?: string;
  at: string;
  by: string;
  via: "chart recorder" | "manual";
};

export type MetalCheck = {
  when: "start of run" | "mid run" | "end of run";
  at: string;
  by: string;
  // Did the detector find and reject each challenge piece?
  fe: boolean;
  nonFe: boolean;
  stainless: boolean;
  note?: string;
};

export type FillCheck = {
  at: string;
  by: string;
  // Declared quantity on the pack, and what the sample actually weighed.
  nominal: number;
  unit: "ml" | "g";
  samples: number[];
};

export type Batch = {
  id: string;
  product: string;
  line: "ice cream" | "chocolate";
  // Litres of mix, or kilograms of couverture.
  volume: number;
  volumeUnit: "L" | "kg";
  unitsMade: number;
  packSize: string;
  startedAt: string;
  // Days before today, so the demo reads the same on any date.
  daysAgo: number;
  by: string;
  pasteurisation?: Pasteurisation;
  metal: MetalCheck[];
  fill: FillCheck[];
  // Set only when somebody stopped the batch.
  stopped?: string;
  // Created by importing a chart rather than shipped with the demo.
  imported?: boolean;
  // The date the chart said, where it said one.
  madeOn?: string;
};

// ————————————————————————— judging —————————————————————————

export type Verdict = {
  status: Status;
  reason: string;
};

export function judgePasteurisation(p: Pasteurisation | undefined, line: Batch["line"]): Verdict {
  if (line === "chocolate") {
    return { status: "ok", reason: "Not a heat-treated product. The chocolate line has no pasteurisation step." };
  }
  if (!p) {
    return { status: "overdue", reason: "No pasteurisation record. The batch cannot be released." };
  }
  if (p.peakC < PASTEURISATION.criticalC) {
    return {
      status: "overdue",
      reason: `Reached ${p.peakC}°C against a ${PASTEURISATION.criticalC}°C critical limit. The mix was not pasteurised — divert and re-process.`,
    };
  }
  if (p.holdSeconds < PASTEURISATION.holdSeconds) {
    return {
      status: "overdue",
      reason: `Held ${p.holdSeconds}s against a ${PASTEURISATION.holdSeconds}s minimum. Temperature alone does not pasteurise.`,
    };
  }
  if (p.belowLimitForwardSeconds !== undefined && p.belowLimitForwardSeconds > 0) {
    return {
      status: "overdue",
      reason: `${p.belowLimitForwardSeconds}s of product went forward below ${PASTEURISATION.criticalC}°C. The peak and the hold are met elsewhere on the run, but under-temperature product reached the filler.`,
    };
  }
  if (PASTEURISATION.divertTestRequired && !p.divertTested) {
    return {
      status: "due",
      reason: "Divert valve not tested before the run. The batch met its limits, but nothing proves the valve would have caught it if it had not.",
    };
  }
  if (p.peakC < PASTEURISATION.targetC) {
    return {
      status: "due",
      reason: `Reached ${p.peakC}°C, above the ${PASTEURISATION.criticalC}°C limit but below the ${PASTEURISATION.targetC}°C the process is set to. Safe, and worth asking why.`,
    };
  }
  return {
    status: "ok",
    reason: `${p.peakC}°C for ${p.holdSeconds}s, above the ${PASTEURISATION.criticalC}°C critical limit.`,
  };
}

export function judgeMetal(checks: MetalCheck[], stopped?: string): Verdict {
  if (stopped) {
    return { status: "ok", reason: "Nothing was packed from this run, so nothing passed the detector." };
  }
  if (checks.length === 0) {
    return { status: "overdue", reason: "No detector challenge recorded for this run." };
  }
  const failed = checks.filter((c) => !c.fe || !c.nonFe || !c.stainless);
  if (failed.length) {
    const miss = failed
      .map((c) => {
        const missed = [
          !c.fe ? `Fe ${METAL_LIMITS.fe}mm` : null,
          !c.nonFe ? `non-Fe ${METAL_LIMITS.nonFe}mm` : null,
          !c.stainless ? `stainless ${METAL_LIMITS.stainless}mm` : null,
        ].filter(Boolean);
        return `${c.when}: missed ${missed.join(", ")}`;
      })
      .join("; ");
    return {
      status: "overdue",
      reason: `Detector failed a challenge. ${miss}. Everything packed since the last passing check is suspect.`,
    };
  }
  const hasStart = checks.some((c) => c.when === "start of run");
  const hasEnd = checks.some((c) => c.when === "end of run");
  if (!hasStart || !hasEnd) {
    return {
      status: "due",
      reason: `Challenged ${checks.length} time${checks.length === 1 ? "" : "s"}, but ${!hasStart ? "not at the start of the run" : "not at the end of the run"}. An end-of-run pass is what makes the run's output defensible.`,
    };
  }
  return { status: "ok", reason: `Challenged ${checks.length} times, all three pieces found and rejected each time.` };
}

// Average quantity rules: the mean must not be below the declared
// quantity, and only a small number of packs may fall below the
// tolerable negative error. Well short of the full legal method, and
// close enough to catch a line drifting light.
//
// The average is only meaningful on a reasonable sample. Below this,
// three packs that happen to come out heavy would clear a line that is
// running light, so the mean is not judged at all — only the absolute
// rule, which applies to every pack however few were weighed.
export const MIN_SAMPLE = 5;
export function tne(nominal: number): number {
  if (nominal <= 50) return nominal * 0.09;
  if (nominal <= 100) return 4.5;
  if (nominal <= 200) return nominal * 0.045;
  if (nominal <= 300) return 9;
  if (nominal <= 500) return nominal * 0.03;
  if (nominal <= 1000) return 15;
  if (nominal <= 10000) return nominal * 0.015;
  return nominal * 0.015;
}

export type FillResult = {
  mean: number;
  min: number;
  max: number;
  belowTne: number;
  belowTwiceTne: number;
  verdict: Verdict;
};

export function judgeFill(f: FillCheck): FillResult {
  const n = f.samples.length;
  const mean = n ? f.samples.reduce((a, b) => a + b, 0) / n : 0;
  const t1 = tne(f.nominal);
  const t2 = t1 * 2;
  const belowTne = f.samples.filter((s) => s < f.nominal - t1).length;
  const belowTwiceTne = f.samples.filter((s) => s < f.nominal - t2).length;

  let verdict: Verdict;
  if (belowTwiceTne > 0) {
    // Scoped the way the detector is: the exposure runs back to the last
    // check that passed, not across everything made that day.
    verdict = {
      status: "overdue",
      reason: `${belowTwiceTne} pack${belowTwiceTne === 1 ? "" : "s"} more than ${t2.toFixed(1)}${f.unit} under the declared ${f.nominal}${f.unit}. No pack may be this light. Everything packed since the last passing weight check is suspect \u2014 hold that and re-weigh.`,
    };
  } else if (n < MIN_SAMPLE) {
    verdict = {
      status: "due",
      reason: `Only ${n} pack${n === 1 ? "" : "s"} weighed. No pack is under the absolute limit, but the average cannot be judged on a sample this small \u2014 ${MIN_SAMPLE} is the minimum and ten is the usual.`,
    };
  } else if (mean < f.nominal) {
    verdict = {
      status: "overdue",
      reason: `Mean ${mean.toFixed(1)}${f.unit} against a declared ${f.nominal}${f.unit}. The average must not be below the declared quantity.`,
    };
  } else if (belowTne > Math.max(1, Math.floor(n * 0.025))) {
    verdict = {
      status: "due",
      reason: `${belowTne} of ${n} packs below the ${t1.toFixed(1)}${f.unit} tolerance. Within the mean, but the line is running light.`,
    };
  } else {
    verdict = {
      status: "ok",
      reason: `Mean ${mean.toFixed(1)}${f.unit} against a declared ${f.nominal}${f.unit}, ${belowTne} of ${n} below tolerance.`,
    };
  }
  return { mean, min: Math.min(...f.samples), max: Math.max(...f.samples), belowTne, belowTwiceTne, verdict };
}

export type BatchState = {
  batch: Batch;
  pasteurisation: Verdict;
  metal: Verdict;
  fill: Verdict;
  status: Status;
  // Plain sentence: is this batch releasable, and if not, why not.
  release: string;
};

export function judgeBatch(b: Batch): BatchState {
  const pas = judgePasteurisation(b.pasteurisation, b.line);
  const met = judgeMetal(b.metal, b.stopped);
  const fillResults = b.fill.map(judgeFill);
  const fill: Verdict = b.stopped
    ? { status: "ok", reason: "Nothing was packed from this run, so there is nothing to weigh." }
    : b.fill.length === 0
    ? { status: "due", reason: "No fill weight check recorded for this run." }
    : fillResults.some((r) => r.verdict.status === "overdue")
      ? fillResults.find((r) => r.verdict.status === "overdue")!.verdict
      : fillResults.some((r) => r.verdict.status === "due")
        ? fillResults.find((r) => r.verdict.status === "due")!.verdict
        : { status: "ok", reason: fillResults[0].verdict.reason };

  // A batch that was stopped has already been dealt with. It reads as a
  // record of a control working, not as an open problem.
  const worst: Status = b.stopped
    ? "due"
    : [pas.status, met.status, fill.status].includes("overdue")
      ? "overdue"
      : [pas.status, met.status, fill.status].includes("due")
        ? "due"
        : "ok";

  let release: string;
  if (b.stopped) {
    release = `Stopped during the run, and correctly. ${b.stopped}`;
  } else if (pas.status === "overdue") {
    release = "Not releasable. The safety step is not evidenced.";
  } else if (met.status === "overdue") {
    release = "Not releasable. Foreign body control failed on this run.";
  } else if (fill.status === "overdue") {
    release = "Not releasable as labelled. The declared quantity is not met.";
  } else if (worst === "due") {
    release = "Releasable. One control needs a look before the next run.";
  } else {
    release = "Releasable. Every critical control passed and is evidenced.";
  }

  return { batch: b, pasteurisation: pas, metal: met, fill, status: worst, release };
}

export function batchStates(batches: Batch[]): BatchState[] {
  const RANK: Record<Status, number> = { overdue: 2, due: 1, ok: 0 };
  return [...batches]
    .map(judgeBatch)
    .sort((a, b) => RANK[b.status] - RANK[a.status] || a.batch.daysAgo - b.batch.daysAgo);
}

// Anything a person needs to act on, for the overview.
export function productionExceptions(batches: Batch[]) {
  const out: { batchId: string; product: string; severe: boolean; reason: string }[] = [];
  for (const st of batchStates(batches)) {
    if (st.batch.stopped) continue;
    for (const v of [st.pasteurisation, st.metal, st.fill]) {
      if (v.status === "ok") continue;
      out.push({
        batchId: st.batch.id,
        product: st.batch.product,
        severe: v.status === "overdue",
        reason: v.reason,
      });
    }
  }
  return out;
}

// ————————————————————————— dates —————————————————————————

export function batchDate(b: Batch): string {
  if (b.madeOn) return b.madeOn;
  const d = new Date();
  d.setDate(d.getDate() - b.daysAgo);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function batchDayLabel(b: Batch): string {
  if (b.madeOn) return b.madeOn;
  if (b.daysAgo === 0) return "Today";
  if (b.daysAgo === 1) return "Yesterday";
  return `${b.daysAgo} days ago`;
}

// ————————————————————————— persistence —————————————————————————
//
// Imported batches survive a reload; the seeded week regenerates every
// time. Only what somebody actually brought in is stored, so the demo
// always opens on the same picture with their own work on top of it.

const BATCHES_KEY = "salcombe-dairy.production.batches";

export function loadBatches(): Batch[] {
  if (typeof window === "undefined") return SEED_BATCHES;
  try {
    const raw = window.localStorage.getItem(BATCHES_KEY);
    if (!raw) return SEED_BATCHES;
    const saved = JSON.parse(raw) as Batch[];
    if (!Array.isArray(saved)) return SEED_BATCHES;
    const mine = saved.filter((b) => b && b.imported && typeof b.id === "string");
    // An imported batch with the same code as a seeded one replaces it:
    // a chart for IC-2609-31 is evidence about that batch, not a second
    // batch that happens to share its number.
    const ids = new Set(mine.map((b) => b.id));
    return [...mine, ...SEED_BATCHES.filter((b) => !ids.has(b.id))];
  } catch {
    return SEED_BATCHES;
  }
}

export function saveBatches(batches: Batch[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BATCHES_KEY, JSON.stringify(batches.filter((b) => b.imported)));
  } catch {
    // Storage full or blocked: it stays in memory for this session.
  }
}

// ————————————————————————— seeded batches —————————————————————————
//
// A week of production. Most of it clean, because most production is:
// a board where everything is on fire teaches nobody anything. The three
// that are not clean each fail differently, and each fails in a way a
// real dairy would recognise.

export const SEED_BATCHES: Batch[] = [
  {
    id: "IC-2609-31",
    product: "Vanilla \u2014 2L catering",
    line: "ice cream",
    volume: 780,
    volumeUnit: "L",
    unitsMade: 384,
    packSize: "2L",
    startedAt: "07:15",
    daysAgo: 0,
    by: "M. Reeve",
    pasteurisation: {
      peakC: 85.4, holdSeconds: 16, chartRef: "CH-2609-31", divertTested: true,
      divertTestedBy: "M. Reeve", at: "08:03", by: "chart recorder", via: "chart recorder",
    },
    metal: [
      { when: "start of run", at: "09:30", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
      { when: "mid run", at: "11:10", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
      { when: "end of run", at: "12:44", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
    ],
    fill: [
      { at: "09:52", by: "M. Reeve", nominal: 2000, unit: "ml", samples: [2014, 2008, 2021, 2002, 2017, 2011, 2026, 2005, 2019, 2013] },
    ],
  },
  {
    id: "IC-2609-30",
    product: "Salted caramel \u2014 500ml retail",
    line: "ice cream",
    volume: 610,
    volumeUnit: "L",
    unitsMade: 1180,
    packSize: "500ml",
    startedAt: "07:05",
    daysAgo: 1,
    by: "M. Reeve",
    pasteurisation: {
      peakC: 81.2, holdSeconds: 15, chartRef: "CH-2609-30", divertTested: true,
      divertTestedBy: "M. Reeve", at: "07:58", by: "chart recorder", via: "chart recorder",
    },
    metal: [
      { when: "start of run", at: "09:12", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
      { when: "end of run", at: "14:02", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
    ],
    fill: [
      { at: "09:40", by: "M. Reeve", nominal: 500, unit: "ml", samples: [504, 498, 507, 501, 495, 503, 509, 500, 497, 506] },
    ],
  },
  {
    id: "IC-2609-29",
    product: "Strawberry \u2014 500ml retail",
    line: "ice cream",
    volume: 540,
    volumeUnit: "L",
    unitsMade: 1040,
    packSize: "500ml",
    startedAt: "06:55",
    daysAgo: 2,
    by: "J. Okafor",
    pasteurisation: {
      peakC: 85.9, holdSeconds: 17, chartRef: "CH-2609-29", divertTested: true,
      divertTestedBy: "J. Okafor", at: "07:44", by: "chart recorder", via: "chart recorder",
    },
    metal: [
      { when: "start of run", at: "09:05", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
      { when: "mid run", at: "11:30", by: "J. Okafor", fe: true, nonFe: false, stainless: true, note: "Non-ferrous piece passed through on first attempt. Detector re-phased and re-challenged \u2014 passed. Product from 09:05 quarantined pending re-inspection." },
      { when: "end of run", at: "13:20", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
    ],
    fill: [
      { at: "09:28", by: "J. Okafor", nominal: 500, unit: "ml", samples: [502, 505, 499, 508, 501, 503, 497, 510, 504, 500] },
    ],
  },
  {
    id: "CH-2609-12",
    product: "70% dark bar \u2014 100g",
    line: "chocolate",
    volume: 220,
    volumeUnit: "kg",
    unitsMade: 2040,
    packSize: "100g",
    startedAt: "08:30",
    daysAgo: 3,
    by: "A. Voss",
    metal: [
      { when: "start of run", at: "08:55", by: "A. Voss", fe: true, nonFe: true, stainless: true },
      { when: "end of run", at: "15:10", by: "A. Voss", fe: true, nonFe: true, stainless: true },
    ],
    fill: [
      { at: "09:20", by: "A. Voss", nominal: 100, unit: "g", samples: [101.4, 100.8, 102.1, 99.6, 101.7, 100.2, 102.6, 100.9, 101.1, 100.4] },
    ],
  },
  {
    id: "IC-2609-28",
    product: "Honeycomb \u2014 2L catering",
    line: "ice cream",
    volume: 700,
    volumeUnit: "L",
    unitsMade: 340,
    packSize: "2L",
    startedAt: "07:10",
    daysAgo: 4,
    by: "M. Reeve",
    pasteurisation: {
      peakC: 86.1, holdSeconds: 16, chartRef: "CH-2609-28", divertTested: false,
      at: "08:01", by: "chart recorder", via: "chart recorder",
    },
    metal: [
      { when: "start of run", at: "09:20", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
      { when: "end of run", at: "13:05", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
    ],
    fill: [
      { at: "09:45", by: "M. Reeve", nominal: 2000, unit: "ml", samples: [2009, 2003, 2016, 2001, 2012, 2007, 2020, 2004, 2011, 2008] },
    ],
  },
  {
    id: "IC-2609-27",
    product: "Chocolate \u2014 500ml retail",
    line: "ice cream",
    volume: 580,
    volumeUnit: "L",
    unitsMade: 1120,
    packSize: "500ml",
    startedAt: "07:00",
    daysAgo: 5,
    by: "M. Reeve",
    pasteurisation: {
      peakC: 78.6, holdSeconds: 15, chartRef: "CH-2609-27", divertTested: true,
      divertTestedBy: "M. Reeve", at: "07:52", by: "chart recorder", via: "chart recorder",
    },
    metal: [
      { when: "start of run", at: "09:02", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
    ],
    fill: [],
    stopped: "Diverted on low temperature. Mix returned to the balance tank and re-processed as IC-2609-27B. No product packed from this run.",
  },
  {
    id: "IC-2609-26",
    product: "Mint choc chip \u2014 500ml retail",
    line: "ice cream",
    volume: 560,
    volumeUnit: "L",
    unitsMade: 1080,
    packSize: "500ml",
    startedAt: "06:58",
    daysAgo: 6,
    by: "J. Okafor",
    pasteurisation: {
      peakC: 85.2, holdSeconds: 16, chartRef: "CH-2609-26", divertTested: true,
      divertTestedBy: "J. Okafor", at: "07:47", by: "chart recorder", via: "chart recorder",
    },
    metal: [
      { when: "start of run", at: "09:08", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
      { when: "end of run", at: "13:44", by: "J. Okafor", fe: true, nonFe: true, stainless: true },
    ],
    fill: [
      { at: "09:35", by: "J. Okafor", nominal: 500, unit: "ml", samples: [491, 488, 495, 486, 492, 489, 497, 484, 493, 490] },
    ],
  },
];
