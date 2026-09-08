// ————————————————————————————————————————————————————————————————
// Salcombe Dairy — recall.
//
// A recall exercise run against the movement log, exactly as it would
// be on the day something is wrong. Start from any lot, trace back to
// what went into it and forward to what it became and who received it,
// find every location still holding any of it, reconcile what came in
// against what is accounted for, and keep the whole thing as a record
// with the clock on it.
//
// Nothing here is simulated. The only thing "mock" about a mock recall is
// that nobody rings the customers at the end.
// ————————————————————————————————————————————————————————————————

import {
  MATERIALS,
  LOCATIONS,
  materialByCode,
  locationById,
  balances,
  fmtDate,
  type Movement,
  type Material,
  type Unit,
  type LotBalance,
} from "./stock";

export type LotRef = { materialCode: string; lot: string };

const key = (r: LotRef) => `${r.materialCode}|${r.lot}`;

// Physical counts entered during an exercise, keyed by lot and location.
// The book says what should be there; the count says what is. The gap
// between them is the whole point of doing the exercise.
export type Counts = Record<string, number>;
export const countKey = (b: { materialCode: string; lot: string; locationId: string }) => `${b.materialCode}|${b.lot}|${b.locationId}`;

// ————————————————————————— genealogy —————————————————————————

// A batch is produced by a production-yield movement whose ref is the
// batch lot; its inputs are the production-consume movements carrying
// the same ref. That link is the whole basis of one-back, one-forward.

export function inputsOf(movements: Movement[], batchLot: string): LotRef[] {
  const seen = new Set<string>();
  const out: LotRef[] = [];
  for (const m of movements) {
    if (m.reason !== "production-consume" || m.ref !== batchLot) continue;
    const r = { materialCode: m.materialCode, lot: m.lot };
    if (seen.has(key(r))) continue;
    seen.add(key(r));
    out.push(r);
  }
  return out;
}

export function batchesUsing(movements: Movement[], lot: LotRef): string[] {
  const out = new Set<string>();
  for (const m of movements) {
    if (m.reason === "production-consume" && m.materialCode === lot.materialCode && m.lot === lot.lot && m.ref) {
      out.add(m.ref);
    }
  }
  return [...out];
}

function batchMaterial(movements: Movement[], batchLot: string): string | undefined {
  return movements.find((m) => m.reason === "production-yield" && m.lot === batchLot)?.materialCode;
}

// ————————————————————————— the trace —————————————————————————

export type Reconciliation = {
  lot: LotRef;
  material: Material | undefined;
  unit: Unit;
  in: number; // received or produced
  // Book quantity on hand, and what was physically counted. Where a
  // location has not been counted, book stands in and the record says so.
  onHand: number;
  counted: number;
  uncounted: number; // locations holding this lot that were not counted
  onHold: number;
  dispatched: number;
  sold: number;
  consumed: number; // used in production, for a raw lot
  waste: number;
  transfers: number; // net of transfers; should be zero if every transfer has both halves
  accounted: number;
  gap: number;
  pct: number; // accounted / in, as a percentage
};

export type Dispatch = {
  lot: LotRef;
  material: Material | undefined;
  customer: string;
  qty: number;
  unit: Unit;
  at: string;
  ts: number;
  ref?: string;
};

export type Trace = {
  origin: LotRef;
  originMaterial: Material | undefined;
  // Raw lot or finished batch — decides which direction has anything in it.
  kind: "raw" | "batch";
  // What went into it (a batch), including inputs of inputs.
  back: LotRef[];
  // What it became (a raw lot): every batch, and batches of those.
  forward: LotRef[];
  // Everything a recall of the origin would have to include.
  affected: LotRef[];
  onHand: LotBalance[];
  dispatches: Dispatch[];
  customers: string[];
  reconciliation: Reconciliation[];
};

export function trace(movements: Movement[], origin: LotRef, counts: Counts = {}): Trace {
  const originMaterial = materialByCode(origin.materialCode);
  const isBatch = movements.some((m) => m.reason === "production-yield" && m.lot === origin.lot);

  // Back: inputs, recursively, so a batch made from a semi-finished
  // batch reaches the raw material behind it.
  const back: LotRef[] = [];
  const seenBack = new Set<string>();
  const walkBack = (lot: string) => {
    for (const i of inputsOf(movements, lot)) {
      if (seenBack.has(key(i))) continue;
      seenBack.add(key(i));
      back.push(i);
      walkBack(i.lot);
    }
  };
  if (isBatch) walkBack(origin.lot);

  // Forward: batches that used this lot, and batches that used those.
  const forward: LotRef[] = [];
  const seenFwd = new Set<string>([key(origin)]);
  const walkFwd = (lot: LotRef) => {
    for (const b of batchesUsing(movements, lot)) {
      const mc = batchMaterial(movements, b);
      if (!mc) continue;
      const r = { materialCode: mc, lot: b };
      if (seenFwd.has(key(r))) continue;
      seenFwd.add(key(r));
      forward.push(r);
      walkFwd(r);
    }
  };
  walkFwd(origin);

  // Affected: the origin and everything downstream of it. Inputs are
  // context — they are not themselves recalled when a batch is.
  const affected = [origin, ...forward];
  const affectedKeys = new Set(affected.map(key));

  const onHand = balances(movements).filter((b) => affectedKeys.has(key(b)) && b.qty > 0);

  const dispatches: Dispatch[] = movements
    .filter((m) => m.reason === "dispatch" && affectedKeys.has(key(m)))
    .map((m) => ({
      lot: { materialCode: m.materialCode, lot: m.lot },
      material: materialByCode(m.materialCode),
      customer: m.customer ?? "Unnamed customer",
      qty: Math.abs(m.qty),
      unit: m.unit,
      at: m.at,
      ts: m.ts,
      ref: m.ref,
    }))
    .sort((a, b) => a.ts - b.ts);

  const customers = [...new Set(dispatches.map((d) => d.customer))];

  const reconciliation = affected.map((lot) => reconcile(movements, lot, counts));

  return {
    origin,
    originMaterial,
    kind: isBatch ? "batch" : "raw",
    back,
    forward,
    affected,
    onHand,
    dispatches,
    customers,
    reconciliation,
  };
}

// Where every unit of a lot went. On-hand stock is taken from the physical
// count where one was made, and from the book where it was not — with the
// record showing which. A hold is not a disposal: held stock is still on
// hand, just not free, so it counts toward accounted-for.
export function reconcile(movements: Movement[], lot: LotRef, counts: Counts = {}): Reconciliation {
  const mine = movements.filter((m) => m.materialCode === lot.materialCode && m.lot === lot.lot);
  const unit = mine[0]?.unit ?? materialByCode(lot.materialCode)?.unit ?? "units";

  let inQty = 0, dispatched = 0, sold = 0, consumed = 0, waste = 0, transfers = 0, holdMoves = 0;
  for (const m of mine) {
    switch (m.reason) {
      case "goods-in":
      case "production-yield":
        inQty += m.qty;
        break;
      case "dispatch":
        dispatched += -m.qty;
        break;
      case "sale":
        sold += -m.qty;
        break;
      case "production-consume":
        consumed += -m.qty;
        break;
      case "waste":
        waste += -m.qty;
        break;
      case "transfer-in":
      case "transfer-out":
        transfers += m.qty;
        break;
      case "hold":
        holdMoves += m.qty;
        break;
      case "adjustment":
        inQty += m.qty;
        break;
    }
  }

  const bs = balances(movements).filter((b) => b.materialCode === lot.materialCode && b.lot === lot.lot && b.qty > 0);
  let onHand = 0, counted = 0, onHold = 0, uncounted = 0;
  for (const b of bs) {
    const c = counts[countKey(b)];
    if (b.location?.holding) {
      onHold += c ?? b.qty;
    } else {
      onHand += b.qty;
      if (c === undefined) { uncounted += 1; counted += b.qty; }
      else counted += c;
    }
  }

  const accounted = counted + onHold + dispatched + sold + consumed + waste;
  const gap = Math.round((inQty - accounted) * 100) / 100;
  const pct = inQty > 0 ? Math.round((accounted / inQty) * 1000) / 10 : 100;

  return {
    lot,
    material: materialByCode(lot.materialCode),
    unit,
    in: inQty,
    onHand,
    counted,
    uncounted,
    onHold,
    dispatched,
    sold,
    consumed,
    waste,
    transfers: Math.round((transfers + holdMoves) * 100) / 100,
    accounted,
    gap,
    pct,
  };
}

// ————————————————————————— holds —————————————————————————

// Place a lot at a location on hold: two movements, out of where it is
// and into the quarantine hold, both on the log. The stock has not moved
// physically — it has been segregated on paper, which is the first thing
// a real recall does — and the log says exactly when and by whom.
export function holdMovements(b: LotBalance, by: string, exerciseId: string): Movement[] {
  const now = new Date();
  const base = {
    materialCode: b.materialCode,
    lot: b.lot,
    unit: b.unit,
    ts: now.getTime(),
    at: fmtDate(now),
    by,
    ref: exerciseId,
    bestBefore: b.bestBefore,
  };
  return [
    { ...base, id: `hold-${now.getTime()}-out`, locationId: b.locationId, qty: -b.qty, reason: "hold", note: `Held from ${b.location?.name ?? b.locationId} — recall exercise` },
    { ...base, id: `hold-${now.getTime()}-in`, locationId: "WH-QUAR", qty: b.qty, reason: "hold", note: `Held from ${b.location?.name ?? b.locationId} — recall exercise` },
  ];
}

// ————————————————————————— the exercise —————————————————————————

export type Exercise = {
  id: string;
  origin: LotRef;
  by: string;
  startedTs: number;
  completedTs?: number;
  // The trace as it stood when the exercise was completed. Stock keeps
  // moving afterwards; the record has to show what was found at the time.
  snapshot?: Trace;
  counts: Counts;
  holds: { lot: LotRef; location: string; qty: number; unit: Unit }[];
  notes?: string;
  outcome: "in progress" | "complete";
};

export function startExercise(origin: LotRef, by: string): Exercise {
  const ts = Date.now();
  return { id: `RC-${ts}`, origin, by, startedTs: ts, counts: {}, holds: [], outcome: "in progress" };
}

export function completeExercise(ex: Exercise, movements: Movement[], notes?: string): Exercise {
  return {
    ...ex,
    completedTs: Date.now(),
    snapshot: trace(movements, ex.origin, ex.counts),
    notes: notes?.trim() || undefined,
    outcome: "complete",
  };
}

// Every location holding affected stock has to have been counted before
// the exercise can be completed. An uncounted location is an unfinished
// recall, whatever the book says.
export function countsOutstanding(t: Trace, counts: Counts): number {
  return t.onHand.filter((b) => !b.location?.holding && counts[countKey(b)] === undefined).length;
}

export function durationLabel(ex: Exercise): string {
  const end = ex.completedTs ?? Date.now();
  const mins = Math.max(0, Math.round((end - ex.startedTs) / 60_000));
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// The claim already made in the answer bank — a trace to 100% within
// four hours — so the record states plainly whether this one met it.
export const TARGET_MINS = 4 * 60;

export function metTarget(ex: Exercise): boolean {
  if (!ex.completedTs || !ex.snapshot) return false;
  const within = ex.completedTs - ex.startedTs <= TARGET_MINS * 60_000;
  const full = ex.snapshot.reconciliation.every((r) => r.pct >= 100);
  return within && full;
}

export function fmtExerciseDate(ex: Exercise): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ex.startedTs));
}

// ————————————————————————— lots to pick from —————————————————————————

export type PickableLot = LotRef & { material: Material | undefined; label: string; kind: "raw" | "batch"; onHand: number; unit: Unit };

export function pickableLots(movements: Movement[]): PickableLot[] {
  const seen = new Map<string, PickableLot>();
  for (const m of movements) {
    const r = { materialCode: m.materialCode, lot: m.lot };
    const k = key(r);
    if (seen.has(k)) continue;
    const material = materialByCode(m.materialCode);
    const isBatch = movements.some((x) => x.reason === "production-yield" && x.lot === m.lot);
    seen.set(k, {
      ...r,
      material,
      label: `${material?.name ?? m.materialCode} · ${m.lot}`,
      kind: isBatch ? "batch" : "raw",
      onHand: 0,
      unit: m.unit,
    });
  }
  for (const b of balances(movements)) {
    const p = seen.get(key(b));
    if (p) p.onHand += b.qty;
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// ————————————————————————— persistence —————————————————————————

const KEY = "salcombe-dairy.recall.exercises";

export function loadExercises(movements: Movement[]): Exercise[] {
  const seeds = seedExercises(movements);
  if (typeof window === "undefined") return seeds;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seeds;
    const saved = JSON.parse(raw) as Exercise[];
    if (!Array.isArray(saved)) return seeds;
    return [...saved.filter((e) => e && typeof e.startedTs === "number"), ...seeds].sort((a, b) => b.startedTs - a.startedTs);
  } catch {
    return seeds;
  }
}

export function saveExercises(list: Exercise[]): void {
  if (typeof window === "undefined") return;
  try {
    const seeded = new Set(["RC-seed-1"]);
    window.localStorage.setItem(KEY, JSON.stringify(list.filter((e) => !seeded.has(e.id) && e.outcome === "complete")));
  } catch {
    // Storage blocked: the exercise stays in memory for this session.
  }
}

// One exercise already on the record from a fortnight ago, so the desk
// opens with the history it is supposed to have. The count at Strete Gate
// came up four short — bars given away as samples and never rung through —
// which is exactly the kind of thing an exercise is for.
export function seedExercises(movements: Movement[]): Exercise[] {
  const origin = { materialCode: "RM-COCOA", lot: "PE-2606-11" };
  const t = trace(movements, origin);
  const counts: Counts = {};
  for (const b of t.onHand) counts[countKey(b)] = b.locationId === "SH-STG" ? b.qty - 4 : b.qty;
  const started = Date.now() - 14 * 86_400_000;
  return [
    {
      id: "RC-seed-1",
      origin,
      by: "A. Voss",
      startedTs: started,
      completedTs: started + 47 * 60_000,
      snapshot: trace(movements, origin, counts),
      counts,
      holds: [],
      notes: "Strete Gate counted four bars short of book. Traced to samples given at the counter and not rung through. Till procedure reissued to shop staff.",
      outcome: "complete",
    },
  ];
}

export const SEED_EXERCISES: Exercise[] = [];

export { MATERIALS, LOCATIONS, locationById };
