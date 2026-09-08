// ————————————————————————————————————————————————————————————————
// Salcombe Dairy — standard operating procedures.
//
// A procedure is an authored decision tree: a fixed sequence of steps,
// each with a fixed correct answer or a fixed set of branches. Nothing is
// generated. The same answers always produce the same outcome, which is
// what an auditor is entitled to expect and what a model could not
// promise.
//
// The run is the record. Every step, every answer, who gave it and
// when, and how the run ended. There is no separate form to fill in
// afterwards — completing the procedure is the paperwork.
// ————————————————————————————————————————————————————————————————

export type StepKind = "confirm" | "reading" | "choice" | "note";

// Where a step sends the run next. A step id, or one of two terminals:
// "end" completes the run, "stop" halts it with an action to take.
export type Next = string | "end" | "stop";

export type Option = {
  label: string;
  next?: Next;
  // Some answers are correct-but-notable: the run continues, but the
  // record flags the step so a supervisor sees it.
  flag?: string;
};

export type Step = {
  id: string;
  prompt: string;
  // A line of context under the prompt — why this step exists, what
  // good looks like. Written for the person doing it.
  guidance?: string;
  kind: StepKind;
  // confirm: the answer must be "yes" to proceed
  // reading: a number that must sit within the limits
  // choice: pick one, each option chooses the next step
  // note: free text, always accepted
  unit?: string;
  min?: number;
  max?: number;
  options?: Option[];
  // For confirm and reading: what happens on failure.
  onFail?: { next: Next; action: string };
  next?: Next;
};

export type Sop = {
  id: string;
  name: string;
  purpose: string;
  appliesTo: string;
  // How often it should run. Daily procedures not run today are due.
  cadence: "daily" | "per batch" | "per delivery" | "on event" | "weekly";
  steps: Step[];
  reference: string;
};

// ————————————————————————— the procedures —————————————————————————
//
// Five that a producer of this shape actually runs. The limits are the
// ones already stated elsewhere in the demo — 85°C for 15 seconds, the
// metal-detector test pieces, the 4°C intake limit — so the procedures
// agree with the answer bank and the check engine.

export const SOPS: Sop[] = [
  {
    id: "SOP-07",
    name: "Allergen changeover clean — line 2",
    purpose:
      "Verifies that line 2 is clean before a product change. The site's free-from claims rest on this being done every time and recorded every time.",
    appliesTo: "Any product change on line 2",
    cadence: "per batch",
    reference: "Cleaning Schedule QMS-11 §3",
    steps: [
      {
        id: "stopped",
        prompt: "Is line 2 stopped and locked out?",
        guidance: "No clean starts on a moving line. Lock-out first, then begin.",
        kind: "confirm",
        onFail: { next: "stop", action: "Stop the line and lock it out, then start this procedure again from the beginning." },
        next: "previous",
      },
      {
        id: "previous",
        prompt: "What was the last product run on this line?",
        guidance: "Recorded so the changeover can be traced if a complaint comes in later.",
        kind: "note",
        next: "strip",
      },
      {
        id: "strip",
        prompt: "Have all product-contact parts been stripped and wet cleaned?",
        guidance: "Hopper, pump, filler heads, nozzles. Every part that touched the last product.",
        kind: "confirm",
        onFail: { next: "stop", action: "Complete the strip and wet clean before continuing. The clean cannot be verified until it is finished." },
        next: "rinse",
      },
      {
        id: "rinse",
        prompt: "Rinsed and sanitised, contact time observed?",
        guidance: "Sanitiser needs its full contact time. Rinsing early is the commonest reason a swab fails.",
        kind: "confirm",
        onFail: { next: "stop", action: "Re-apply sanitiser and observe the full contact time before swabbing." },
        next: "swab",
      },
      {
        id: "swab",
        prompt: "ATP swab reading from the filler head",
        guidance: "The limit is 10 RLU. A reading above it means the clean did not work, not that the meter is wrong.",
        kind: "reading",
        unit: "RLU",
        max: 10,
        onFail: { next: "stop", action: "The clean has failed. Strip, wet clean, sanitise and re-swab. Do not restart the line on this result." },
        next: "visual",
      },
      {
        id: "visual",
        prompt: "Visual inspection of the line — any residue, any standing water?",
        kind: "choice",
        options: [
          { label: "Clean and dry", next: "signoff" },
          { label: "Residue found", next: "stop" },
          { label: "Standing water, otherwise clean", next: "signoff", flag: "Standing water noted at inspection — dried before restart." },
        ],
        onFail: { next: "stop", action: "Residue means the clean has failed. Return to strip and wet clean." },
      },
      {
        id: "signoff",
        prompt: "Sign off the changeover",
        guidance: "Your name goes on the record as the person who verified this line is clean.",
        kind: "confirm",
        onFail: { next: "stop", action: "The changeover cannot be released without sign-off." },
        next: "end",
      },
    ],
  },
  {
    id: "SOP-04",
    name: "Pasteuriser start-up",
    purpose: "Confirms the pasteuriser is holding temperature and the divert valve works before any mix goes through it.",
    appliesTo: "Start of every production day",
    cadence: "daily",
    reference: "Process Spec PS-04 §3.1",
    steps: [
      {
        id: "recorder",
        prompt: "Is the chart recorder running and dated for today?",
        guidance: "The chart is the evidence. If it is not recording, nothing that follows can be proven.",
        kind: "confirm",
        onFail: { next: "stop", action: "Start the chart recorder and confirm the date before proceeding." },
        next: "temp",
      },
      {
        id: "temp",
        prompt: "Holding tube temperature",
        guidance: "Must be at or above 85°C. Read it from the indicating thermometer, not the recorder.",
        kind: "reading",
        unit: "°C",
        min: 85,
        onFail: { next: "stop", action: "Below the pasteurisation temperature. Do not run product. Let the unit come up to temperature and read again." },
        next: "hold",
      },
      {
        id: "hold",
        prompt: "Hold time at temperature",
        guidance: "15 seconds minimum through the holding tube.",
        kind: "reading",
        unit: "s",
        min: 15,
        onFail: { next: "stop", action: "Hold time is below 15 seconds. Check the flow rate and the holding tube before running product." },
        next: "divert",
      },
      {
        id: "divert",
        prompt: "Divert valve test — does it divert when the set-point is dropped?",
        guidance: "Drop the set-point below 85°C and watch the valve. It must divert before any product could pass.",
        kind: "confirm",
        onFail: { next: "stop", action: "The divert valve did not operate. The pasteuriser is not safe to run. Tag it out and call the engineer." },
        next: "restore",
      },
      {
        id: "restore",
        prompt: "Set-point restored to 85°C and valve returned to forward flow?",
        kind: "confirm",
        onFail: { next: "stop", action: "Restore the set-point and confirm forward flow before running product." },
        next: "end",
      },
    ],
  },
  {
    id: "SOP-12",
    name: "Goods-in receipt — chilled",
    purpose: "Decides whether a chilled delivery is accepted, and records the basis for the decision.",
    appliesTo: "Every chilled delivery at the goods-in door",
    cadence: "per delivery",
    reference: "Supplier Approval QMS-05 §1",
    steps: [
      {
        id: "supplier",
        prompt: "Is the supplier on the approved list?",
        guidance: "If they are not, nothing is unloaded. Approved suppliers are the ones with current declarations on file.",
        kind: "confirm",
        onFail: { next: "stop", action: "Not an approved supplier. Refuse the delivery and tell the office." },
        next: "vehicle",
      },
      {
        id: "vehicle",
        prompt: "Vehicle temperature on arrival",
        guidance: "From the vehicle's own display before the doors open.",
        kind: "reading",
        unit: "°C",
        max: 5,
        onFail: { next: "quarantine", action: "" },
        next: "product",
      },
      {
        id: "product",
        prompt: "Product temperature, probed between packs",
        guidance: "Probe between two packs in the middle of the load, not the outside of a pack.",
        kind: "reading",
        unit: "°C",
        max: 4,
        onFail: { next: "quarantine", action: "" },
        next: "packaging",
      },
      {
        id: "quarantine",
        prompt: "The temperature is out of limit. What is the decision?",
        guidance: "Either outcome is acceptable. Not recording which is not.",
        kind: "choice",
        options: [
          { label: "Reject the delivery", next: "stop" },
          { label: "Accept into quarantine for a quality decision", next: "packaging", flag: "Accepted into quarantine on arrival temperature." },
        ],
        onFail: { next: "stop", action: "Delivery rejected on temperature. Record the reading on the note and return it with the driver." },
      },
      {
        id: "packaging",
        prompt: "Packaging intact, no damage, no signs of thawing?",
        kind: "confirm",
        onFail: { next: "stop", action: "Reject the damaged lines. Note them on the delivery note before the driver leaves." },
        next: "lot",
      },
      {
        id: "lot",
        prompt: "Lot or batch codes present on every line that needs one?",
        guidance: "Raw materials, finished goods and food-contact packaging all need a lot. Outer cases do not.",
        kind: "confirm",
        onFail: { next: "stop", action: "Hold the lines without lot codes. They cannot be booked in until a lot is recorded from the product label." },
        next: "end",
      },
    ],
  },
  {
    id: "SOP-09",
    name: "Coldstore excursion response",
    purpose: "What to do when a freezer or coldstore alarms. Decides whether stock is safe, and records the decision.",
    appliesTo: "Any temperature alarm on a coldstore, shop freezer or vehicle",
    cadence: "on event",
    reference: "Cold Chain Procedure QMS-09 §2",
    steps: [
      {
        id: "which",
        prompt: "Which asset has alarmed?",
        kind: "note",
        next: "reading",
      },
      {
        id: "reading",
        prompt: "Current product temperature, probed",
        guidance: "Probe the product, not the air. Air recovers fast; product does not.",
        kind: "reading",
        unit: "°C",
        max: -12,
        onFail: { next: "decide", action: "" },
        next: "monitor",
      },
      {
        id: "decide",
        prompt: "Product is above −12°C. What is the decision?",
        guidance: "Above −12°C ice cream has begun to soften. It may be recoverable if it has not thawed; it must not be re-frozen if it has.",
        kind: "choice",
        options: [
          { label: "Quarantine the stock and move it to a working freezer", next: "cause", flag: "Stock quarantined after excursion." },
          { label: "Dispose — product has thawed", next: "cause", flag: "Stock disposed after excursion — thawed." },
        ],
      },
      {
        id: "monitor",
        prompt: "Product is within limit. Is the asset recovering?",
        kind: "choice",
        options: [
          { label: "Yes — temperature falling", next: "cause" },
          { label: "No — still rising", next: "decide" },
        ],
      },
      {
        id: "cause",
        prompt: "What caused the excursion?",
        kind: "choice",
        options: [
          { label: "Door left open", next: "end" },
          { label: "Power or compressor fault", next: "end", flag: "Equipment fault — engineer to be called." },
          { label: "Defrost cycle", next: "end" },
          { label: "Unknown", next: "end", flag: "Cause unknown — asset to be watched." },
        ],
      },
    ],
  },
  {
    id: "SOP-05",
    name: "Metal detector challenge test",
    purpose: "Proves the metal detector at pack-off rejects the three test pieces before a run starts.",
    appliesTo: "Start of every production run on the packing line",
    cadence: "per batch",
    reference: "Process Spec PS-04 §5",
    steps: [
      {
        id: "fe",
        prompt: "Ferrous test piece, 1.5mm — rejected?",
        guidance: "Pass the piece through in the product. It must reject and the line must stop.",
        kind: "confirm",
        onFail: { next: "stop", action: "The detector did not reject the ferrous piece. Do not run product. Tag the line out and call the engineer." },
        next: "nonfe",
      },
      {
        id: "nonfe",
        prompt: "Non-ferrous test piece, 2.0mm — rejected?",
        kind: "confirm",
        onFail: { next: "stop", action: "The detector did not reject the non-ferrous piece. Do not run product. Tag the line out and call the engineer." },
        next: "ss",
      },
      {
        id: "ss",
        prompt: "Stainless steel test piece, 2.5mm — rejected?",
        kind: "confirm",
        onFail: { next: "stop", action: "The detector did not reject the stainless piece. Do not run product. Tag the line out and call the engineer." },
        next: "reject",
      },
      {
        id: "reject",
        prompt: "Reject mechanism cleared and the line reset?",
        kind: "confirm",
        onFail: { next: "stop", action: "Clear the reject bin and reset the line before running." },
        next: "end",
      },
    ],
  },
];

export function sopById(id: string): Sop | undefined {
  return SOPS.find((s) => s.id === id);
}

// ————————————————————————— runs —————————————————————————

export type Answer = {
  stepId: string;
  // What was given: "yes" / "no" for confirm, a number for reading, an
  // option label for choice, free text for note.
  value: string;
  passed: boolean;
  flag?: string;
  at: string;
};

export type Outcome = "in progress" | "complete" | "stopped";

export type Run = {
  id: string;
  sopId: string;
  by: string;
  // When it started, as a real timestamp. A saved record has to say the
  // right day when it is reopened next week, which "minutes ago" cannot.
  ts: number;
  startedAt: string;
  answers: Answer[];
  outcome: Outcome;
  // The step the run is on, or ended on.
  stepId: string | null;
  stopAction?: string;
};

export function minsAgo(run: Run): number {
  return Math.max(0, (Date.now() - run.ts) / 60_000);
}

export function fmtRunDate(run: Run): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(run.ts),
  );
}

export function startRun(sop: Sop, by: string): Run {
  const ts = Date.now();
  return {
    id: `run-${ts}`,
    sopId: sop.id,
    by,
    ts,
    startedAt: clock(0),
    answers: [],
    outcome: "in progress",
    stepId: sop.steps[0].id,
  };
}

export function stepById(sop: Sop, id: string | null): Step | undefined {
  return id ? sop.steps.find((s) => s.id === id) : undefined;
}

// The one function that decides anything. Given a step and an answer,
// says whether it passed and where the run goes next. Pure.
export function evaluate(step: Step, raw: string): { passed: boolean; next: Next; flag?: string; value: string } {
  switch (step.kind) {
    case "confirm": {
      const yes = raw === "yes";
      return yes
        ? { passed: true, next: step.next ?? "end", value: "Yes" }
        : { passed: false, next: step.onFail?.next ?? "stop", value: "No" };
    }
    case "reading": {
      const n = parseFloat(raw);
      if (!Number.isFinite(n)) return { passed: false, next: step.id, value: raw };
      const okMin = step.min === undefined || n >= step.min;
      const okMax = step.max === undefined || n <= step.max;
      const value = `${n}${step.unit ? ` ${step.unit}` : ""}`;
      return okMin && okMax
        ? { passed: true, next: step.next ?? "end", value }
        : { passed: false, next: step.onFail?.next ?? "stop", value };
    }
    case "choice": {
      const opt = step.options?.find((o) => o.label === raw);
      if (!opt) return { passed: false, next: step.id, value: raw };
      const next = opt.next ?? step.next ?? "end";
      return { passed: next !== "stop", next, flag: opt.flag, value: opt.label };
    }
    case "note":
      return { passed: true, next: step.next ?? "end", value: raw.trim() };
  }
}

export function answer(sop: Sop, run: Run, raw: string): Run {
  const step = stepById(sop, run.stepId);
  if (!step || run.outcome !== "in progress") return run;

  const r = evaluate(step, raw);
  // A malformed answer (unparseable reading, unknown option) is not
  // recorded; the step simply asks again.
  if (r.next === step.id && !r.passed) return run;

  const answers = [...run.answers, { stepId: step.id, value: r.value, passed: r.passed, flag: r.flag, at: clock(0) }];

  if (r.next === "stop") {
    return { ...run, answers, outcome: "stopped", stepId: step.id, stopAction: step.onFail?.action || stopActionFor(step, r.value) };
  }
  if (r.next === "end") {
    return { ...run, answers, outcome: "complete", stepId: null };
  }
  return { ...run, answers, stepId: r.next };
}

// A choice that stops the run may carry its own reason on the option;
// otherwise the step's onFail action stands.
function stopActionFor(step: Step, value: string): string {
  if (step.kind === "choice") {
    const opt = step.options?.find((o) => o.label === value);
    if (opt?.flag) return opt.flag;
  }
  return step.onFail?.action ?? "Run stopped.";
}

// ————————————————————————— schedule —————————————————————————

export type Due = { sop: Sop; lastRun?: Run; state: "done" | "due" | "n/a" };

export function schedule(runs: Run[]): Due[] {
  return SOPS.map((sop) => {
    const mine = runs.filter((r) => r.sopId === sop.id && r.outcome !== "in progress").sort((a, b) => b.ts - a.ts);
    const last = mine[0];
    if (sop.cadence === "daily") {
      const doneToday = last !== undefined && minsAgo(last) < 60 * 18 && last.outcome === "complete";
      return { sop, lastRun: last, state: doneToday ? "done" : "due" };
    }
    if (sop.cadence === "weekly") {
      const doneThisWeek = last !== undefined && minsAgo(last) < 60 * 24 * 7 && last.outcome === "complete";
      return { sop, lastRun: last, state: doneThisWeek ? "done" : "due" };
    }
    return { sop, lastRun: last, state: "n/a" };
  });
}

export function clock(minsAgo: number): string {
  const d = new Date(Date.now() - minsAgo * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtAgo(mins: number): string {
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const h = mins / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// ————————————————————————— seeded history —————————————————————————
//
// A few runs already on the record, so the desk opens with something to
// show: yesterday's pasteuriser start-up (so today's is due), a clean
// that passed, and one that was stopped on a swab.

function seed(id: string, sopId: string, by: string, ago: number, values: string[]): Run {
  const sop = sopById(sopId)!;
  const ts = Date.now() - ago * 60_000;
  let run: Run = { id, sopId, by, ts, startedAt: clock(ago), answers: [], outcome: "in progress", stepId: sop.steps[0].id };
  for (const v of values) run = answer(sop, run, v);
  // Stamp every answer with the run's own clock rather than now.
  run.answers = run.answers.map((a, i) => ({ ...a, at: clock(ago - i) }));
  return run;
}

export const SEED_RUNS: Run[] = [
  seed("r-past-1", "SOP-04", "M. Reeve", 60 * 26, ["yes", "85.6", "15", "yes", "yes"]),
  seed("r-past-2", "SOP-07", "A. Voss", 60 * 22, ["yes", "Honeycomb", "yes", "yes", "6", "Clean and dry", "yes"]),
  seed("r-past-3", "SOP-05", "J. Okafor", 60 * 21, ["yes", "yes", "yes", "yes"]),
  seed("r-past-4", "SOP-07", "M. Reeve", 60 * 3, ["yes", "Salted caramel", "yes", "yes", "23"]),
  seed("r-past-5", "SOP-12", "J. Okafor", 60 * 2, ["yes", "3.8", "3.1", "yes", "yes"]),
];

// ————————————————————————— persistence —————————————————————————
//
// Runs a person has made are kept in the browser so they survive leaving
// the section and reloading the page. The seeded history is not saved —
// it is regenerated relative to today, so the demo always opens with
// yesterday's start-up correctly due.

const KEY = "salcombe-dairy.procedures.runs";

export function loadRuns(): Run[] {
  if (typeof window === "undefined") return SEED_RUNS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SEED_RUNS;
    const saved = JSON.parse(raw) as Run[];
    if (!Array.isArray(saved)) return SEED_RUNS;
    return [...saved.filter((r) => r && typeof r.ts === "number"), ...SEED_RUNS].sort((a, b) => b.ts - a.ts);
  } catch {
    return SEED_RUNS;
  }
}

export function saveRuns(runs: Run[]): void {
  if (typeof window === "undefined") return;
  try {
    const seeded = new Set(SEED_RUNS.map((r) => r.id));
    const own = runs.filter((r) => !seeded.has(r.id) && r.outcome !== "in progress");
    window.localStorage.setItem(KEY, JSON.stringify(own));
  } catch {
    // Storage full or blocked: the run stays in memory for this session.
  }
}
