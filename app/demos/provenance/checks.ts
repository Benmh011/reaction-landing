// ————————————————————————————————————————————————————————————————
// Provenance — the check engine.
//
// One engine, several configured check types. A freezer temperature, a
// chocolate conditioning reading, a van journey and a scales calibration
// are the same object underneath: a scheduled observation, taken by a
// named person, at a known time, measured against a threshold, producing
// an immutable pass/fail and raising an exception when it fails.
//
// Deliberately deterministic and free of React. Every verdict here is a
// pure function of the reading and the asset's own limits — the same
// inputs always produce the same outcome, which is what an auditor is
// entitled to expect and what a model could not promise.
// ————————————————————————————————————————————————————————————————

import type { Status } from "./data";

// ————————————————————————— thresholds —————————————————————————

// A band is inclusive. `max: -18` means "at or below −18°C passes".
// Ice cream and chocolate want opposite regimes, which is the whole
// reason limits live on the asset rather than on the engine.
export type Band = {
  min?: number;
  max?: number;
  unit: string;
  // How long a reading may sit outside the band before it stops being a
  // door-open blip and becomes a genuine excursion. Minutes.
  toleranceMins: number;
  // How far outside the band before it is an immediate fail regardless
  // of duration. Absolute distance in the band's unit.
  hardBreach?: number;
};

export type CheckKind = "temperature" | "climate" | "calibration";

export type AssetClass =
  | "coldstore"
  | "shop-freezer"
  | "vehicle"
  | "conditioning"
  | "instrument";

export type Asset = {
  id: string;
  name: string;
  site: string;
  cls: AssetClass;
  kind: CheckKind;
  band: Band;
  // A second band for assets measured on two axes — a chocolate store is
  // controlled for humidity as well as temperature, because condensation
  // on cooling chocolate causes sugar bloom.
  band2?: Band & { label: string };
  // How often the check falls due, in hours.
  everyHours: number;
};

// ————————————————————————— the estate —————————————————————————
//
// Estuary Creamery: one factory with its own coldstore and chocolate
// conditioning room, four shops, two refrigerated vans, and the scales
// that decide what a customer is actually charged for.

export const ASSETS: Asset[] = [
  {
    id: "CS-A",
    name: "Coldstore A — factory",
    site: "Island Street",
    cls: "coldstore",
    kind: "temperature",
    band: { max: -18, unit: "°C", toleranceMins: 15, hardBreach: 4 },
    everyHours: 4,
  },
  {
    id: "CS-B",
    name: "Coldstore B — dispatch holding",
    site: "Island Street",
    cls: "coldstore",
    kind: "temperature",
    band: { max: -18, unit: "°C", toleranceMins: 15, hardBreach: 4 },
    everyHours: 4,
  },
  {
    id: "CH-1",
    name: "Chocolate conditioning room",
    site: "Island Street",
    cls: "conditioning",
    kind: "climate",
    // Chocolate is not a frozen product. Too warm and it blooms fat; too
    // cold and it sweats on the way out. The humidity band matters as
    // much as the temperature one.
    band: { min: 14, max: 18, unit: "°C", toleranceMins: 60, hardBreach: 4 },
    band2: { min: 45, max: 55, unit: "%RH", toleranceMins: 60, hardBreach: 10, label: "Humidity" },
    everyHours: 12,
  },
  {
    id: "VAN-1",
    name: "Van 1 — South Hams round",
    site: "Mobile",
    cls: "vehicle",
    kind: "temperature",
    // A delivery van opens its doors a dozen times a round, so the
    // tolerance is longer than a sealed coldstore's — but a hard breach
    // still fails immediately.
    band: { max: -18, unit: "°C", toleranceMins: 20, hardBreach: 6 },
    everyHours: 2,
  },
  {
    id: "VAN-2",
    name: "Van 2 — Bristol / Bath round",
    site: "Mobile",
    cls: "vehicle",
    kind: "temperature",
    band: { max: -18, unit: "°C", toleranceMins: 20, hardBreach: 6 },
    everyHours: 2,
  },
  {
    id: "SF-ISL",
    name: "Shop freezer — Island Street",
    site: "Salcombe",
    cls: "shop-freezer",
    kind: "temperature",
    band: { max: -18, unit: "°C", toleranceMins: 20, hardBreach: 5 },
    everyHours: 12,
  },
  {
    id: "SF-STG",
    name: "Shop freezer — Strete Gate",
    site: "Strete",
    cls: "shop-freezer",
    kind: "temperature",
    band: { max: -18, unit: "°C", toleranceMins: 20, hardBreach: 5 },
    everyHours: 12,
  },
  {
    id: "SF-PUL",
    name: "Shop freezer — Pulteney Bridge",
    site: "Bath",
    cls: "shop-freezer",
    kind: "temperature",
    band: { max: -18, unit: "°C", toleranceMins: 20, hardBreach: 5 },
    everyHours: 12,
  },
  {
    id: "SC-PACK",
    name: "Pack-off scales — line 2",
    site: "Island Street",
    cls: "instrument",
    kind: "calibration",
    // A calibration check is a comparison, so the band is the permitted
    // deviation from a known test weight rather than an absolute range.
    band: { max: 2, unit: "g", toleranceMins: 0, hardBreach: 5 },
    everyHours: 24,
  },
  {
    id: "SC-TRADE",
    name: "Trade counter scales",
    site: "Island Street",
    cls: "instrument",
    kind: "calibration",
    band: { max: 2, unit: "g", toleranceMins: 0, hardBreach: 5 },
    everyHours: 168,
  },
];

export function assetById(id: string): Asset | undefined {
  return ASSETS.find((a) => a.id === id);
}

// ————————————————————————— readings —————————————————————————

export type Reading = {
  id: string;
  assetId: string;
  // Minutes before "now". The demo has no clock of its own, so the whole
  // engine works in relative time and reads the same on any day.
  minsAgo: number;
  value: number;
  value2?: number;
  // For calibration: what the test weight should have read.
  expected?: number;
  by: string;
  via: "voice" | "manual" | "auto";
  note?: string;
  // How long the asset had already been outside its band when this
  // reading was taken. Zero for anything in spec.
  outOfBandMins?: number;
};

// ————————————————————————— evaluation —————————————————————————

export type Verdict = {
  status: Status;
  // Plain English, written for the person who has to act on it rather
  // than for the person who wrote the engine.
  reason: string;
  breach: boolean;
  deviation: number;
};

function withinBand(value: number, band: Band): boolean {
  if (band.min !== undefined && value < band.min) return false;
  if (band.max !== undefined && value > band.max) return false;
  return true;
}

function deviationFrom(value: number, band: Band): number {
  if (band.min !== undefined && value < band.min) return band.min - value;
  if (band.max !== undefined && value > band.max) return value - band.max;
  return 0;
}

function describeBand(band: Band): string {
  if (band.min !== undefined && band.max !== undefined) {
    return `${band.min} to ${band.max}${band.unit}`;
  }
  if (band.max !== undefined) return `at or below ${band.max}${band.unit}`;
  if (band.min !== undefined) return `at or above ${band.min}${band.unit}`;
  return "no limit set";
}

// The core rule. Three outcomes, in strict order of severity:
//
//   overdue — a hard breach, or outside the band longer than tolerance
//   due     — outside the band but still inside tolerance, so recoverable
//   ok      — inside the band
//
// Duration is what separates a van door standing open from stock being
// lost. The existing sample data already made that distinction in prose;
// this makes it a rule.
export function evaluate(asset: Asset, reading: Reading): Verdict {
  if (asset.kind === "calibration") return evaluateCalibration(asset, reading);

  const primary = evaluateAxis(reading.value, asset.band, reading.outOfBandMins ?? 0, asset.band.unit);

  if (asset.band2 && reading.value2 !== undefined) {
    const secondary = evaluateAxis(
      reading.value2,
      asset.band2,
      reading.outOfBandMins ?? 0,
      asset.band2.unit,
    );
    // The worse of the two axes decides the asset. A chocolate room at
    // the right temperature and the wrong humidity is still wrong.
    const rank: Record<Status, number> = { ok: 0, due: 1, overdue: 2 };
    if (rank[secondary.status] > rank[primary.status]) {
      return {
        ...secondary,
        reason: `${asset.band2.label}: ${secondary.reason}`,
      };
    }
  }

  return primary;
}

function evaluateAxis(value: number, band: Band, outOfBandMins: number, unit: string): Verdict {
  const dev = deviationFrom(value, band);

  if (withinBand(value, band)) {
    return {
      status: "ok",
      reason: `In spec — ${describeBand(band)}.`,
      breach: false,
      deviation: 0,
    };
  }

  if (band.hardBreach !== undefined && dev >= band.hardBreach) {
    return {
      status: "overdue",
      reason: `${dev.toFixed(1)}${unit} outside limit — immediate breach. Quarantine stock and record the decision.`,
      breach: true,
      deviation: dev,
    };
  }

  if (outOfBandMins > band.toleranceMins) {
    return {
      status: "overdue",
      reason: `Outside limit for ${outOfBandMins} min, over the ${band.toleranceMins} min tolerance. Treat as an excursion.`,
      breach: true,
      deviation: dev,
    };
  }

  return {
    status: "due",
    reason: `${dev.toFixed(1)}${unit} outside limit for ${outOfBandMins} min — within the ${band.toleranceMins} min tolerance. Recovering.`,
    breach: false,
    deviation: dev,
  };
}

function evaluateCalibration(asset: Asset, reading: Reading): Verdict {
  const expected = reading.expected ?? 0;
  const dev = Math.abs(reading.value - expected);
  const tol = asset.band.max ?? 0;
  const unit = asset.band.unit;

  if (dev <= tol) {
    return {
      status: "ok",
      reason: `Reads ${reading.value}${unit} against a ${expected}${unit} test weight — ${dev.toFixed(1)}${unit} deviation, inside the ±${tol}${unit} tolerance.`,
      breach: false,
      deviation: dev,
    };
  }

  if (asset.band.hardBreach !== undefined && dev >= asset.band.hardBreach) {
    return {
      status: "overdue",
      reason: `Reads ${reading.value}${unit} against ${expected}${unit} — ${dev.toFixed(1)}${unit} out. Take the instrument out of service and re-weigh anything packed since the last passing check.`,
      breach: true,
      deviation: dev,
    };
  }

  return {
    status: "overdue",
    reason: `Reads ${reading.value}${unit} against ${expected}${unit} — ${dev.toFixed(1)}${unit} out, beyond the ±${tol}${unit} tolerance. Adjust and re-check before further packing.`,
    breach: true,
    deviation: dev,
  };
}

// ————————————————————————— scheduling —————————————————————————

// Whether the check itself is overdue, which is a separate question from
// whether the last reading passed. An asset can be perfectly in spec and
// still be a compliance failure because nobody has looked at it.
export type DueState = {
  status: Status;
  reason: string;
  hoursSince: number;
};

export function dueState(asset: Asset, lastReading?: Reading): DueState {
  if (!lastReading) {
    return {
      status: "overdue",
      reason: "No check recorded.",
      hoursSince: Infinity,
    };
  }

  const hours = lastReading.minsAgo / 60;
  const limit = asset.everyHours;

  if (hours > limit) {
    return {
      status: "overdue",
      reason: `Last checked ${fmtAgo(lastReading.minsAgo)} ago — due every ${limit}h.`,
      hoursSince: hours,
    };
  }
  if (hours > limit * 0.75) {
    return {
      status: "due",
      reason: `Due within the hour.`,
      hoursSince: hours,
    };
  }
  return {
    status: "ok",
    reason: `Checked ${fmtAgo(lastReading.minsAgo)} ago.`,
    hoursSince: hours,
  };
}

export function fmtAgo(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = mins / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)}h`;
  return `${Math.round(h / 24)}d`;
}

// A clock-time label derived from minutes-ago, so the board reads like a
// real shift log without the demo depending on today's date.
export function clockLabel(minsAgo: number): string {
  const now = new Date();
  const then = new Date(now.getTime() - minsAgo * 60_000);
  return `${String(then.getHours()).padStart(2, "0")}:${String(then.getMinutes()).padStart(2, "0")}`;
}

// ————————————————————————— roll-up —————————————————————————

export type AssetState = {
  asset: Asset;
  last?: Reading;
  verdict?: Verdict;
  due: DueState;
  // The worse of "the reading failed" and "the check is overdue".
  status: Status;
};

const RANK: Record<Status, number> = { ok: 0, due: 1, overdue: 2 };

export function worst(a: Status, b: Status): Status {
  return RANK[a] >= RANK[b] ? a : b;
}

export function stateFor(asset: Asset, readings: Reading[]): AssetState {
  const mine = readings
    .filter((r) => r.assetId === asset.id)
    .sort((a, b) => a.minsAgo - b.minsAgo);
  const last = mine[0];
  const verdict = last ? evaluate(asset, last) : undefined;
  const due = dueState(asset, last);
  const status = verdict ? worst(verdict.status, due.status) : due.status;
  return { asset, last, verdict, due, status };
}

export function boardState(readings: Reading[]): AssetState[] {
  return ASSETS.map((a) => stateFor(a, readings)).sort(
    (x, y) => RANK[y.status] - RANK[x.status] || x.asset.name.localeCompare(y.asset.name),
  );
}

// ————————————————————————— exceptions —————————————————————————

export type Exception = {
  assetId: string;
  assetName: string;
  site: string;
  at: string;
  reason: string;
  status: Status;
  breach: boolean;
};

export function exceptions(readings: Reading[]): Exception[] {
  const out: Exception[] = [];
  for (const st of boardState(readings)) {
    if (st.status === "ok") continue;
    out.push({
      assetId: st.asset.id,
      assetName: st.asset.name,
      site: st.asset.site,
      at: st.last ? clockLabel(st.last.minsAgo) : "—",
      reason: st.verdict && st.verdict.status !== "ok" ? st.verdict.reason : st.due.reason,
      status: st.status,
      breach: st.verdict?.breach ?? false,
    });
  }
  return out;
}

// ————————————————————————— seeded history —————————————————————————
//
// A morning's worth of readings across the estate. Written to show the
// engine's range: steady assets, a van recovering from a door-open spike,
// a shop freezer in genuine excursion, a scales check that failed, and
// one asset nobody has checked.

export const SEED_READINGS: Reading[] = [
  { id: "r1", assetId: "CS-A", minsAgo: 42, value: -22.6, by: "chart recorder", via: "auto", outOfBandMins: 0 },
  { id: "r2", assetId: "CS-A", minsAgo: 282, value: -22.1, by: "chart recorder", via: "auto", outOfBandMins: 0 },
  { id: "r3", assetId: "CS-B", minsAgo: 55, value: -19.8, by: "chart recorder", via: "auto", outOfBandMins: 0 },

  {
    id: "r4",
    assetId: "CH-1",
    minsAgo: 130,
    value: 16.4,
    value2: 51,
    by: "A. Voss",
    via: "voice",
    outOfBandMins: 0,
    note: "Tempering room steady overnight.",
  },

  { id: "r5", assetId: "VAN-1", minsAgo: 18, value: -19.4, by: "M. Reeve", via: "auto", outOfBandMins: 0, note: "On round · 6 drops remaining" },
  {
    id: "r6",
    assetId: "VAN-2",
    minsAgo: 24,
    value: -14.1,
    by: "J. Okafor",
    via: "auto",
    outOfBandMins: 12,
    note: "Door-open spike 11:38 · recovering",
  },

  { id: "r7", assetId: "SF-ISL", minsAgo: 96, value: -18.9, by: "S. Trent", via: "voice", outOfBandMins: 0 },
  { id: "r8", assetId: "SF-PUL", minsAgo: 210, value: -18.9, by: "Shop — Bath", via: "voice", outOfBandMins: 0 },
  {
    id: "r9",
    assetId: "SF-STG",
    minsAgo: 34,
    value: -11.2,
    by: "S. Trent",
    via: "manual",
    outOfBandMins: 22,
    note: "Above −15°C for 22 min · alert sent 12:04",
  },

  {
    id: "r10",
    assetId: "SC-PACK",
    minsAgo: 300,
    value: 1003.4,
    expected: 1000,
    by: "J. Okafor",
    via: "manual",
    note: "1kg test weight, start of shift.",
  },
  {
    id: "r11",
    assetId: "SC-TRADE",
    minsAgo: 5040,
    value: 996.2,
    expected: 1000,
    by: "S. Trent",
    via: "manual",
    note: "Weekly check.",
  },
  // CS-B has one reading but no recent one; SC-PACK's is inside tolerance.
  // Nothing is recorded for the Island Street shop beyond r7 — deliberately
  // leaving one asset thin so the board has something to say.
];
