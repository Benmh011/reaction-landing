// ————————————————————————————————————————————————————————————————
// Salcombe Dairy — cold chain telemetry.
//
// Continuous remote temperature readings from every coldstore, shop
// freezer, conditioning room and van, judged against the same limits the
// check engine uses, so a sensor and a person with a probe agree on what
// an excursion is.
//
// The desk reads from a TelemetrySource. What ships now is a simulated
// source that behaves like real hardware — defrost cycles, door-open
// spikes on the vans, a compressor slowly failing at Strete Gate — so
// the desk can be seen working. When hardware arrives, its adapter
// implements the same interface and the desk does not change.
//
// The hardware this is built to take, as of September 2026:
//
//   Premises   testo 160/162 WiFi loggers (Testo Cloud, REST API)
//              Comark RF500 mesh transmitters (Comark Cloud, REST API)
//              Disruptive Technologies (push, via a webhook Data Connector)
//              All EN 12830, which is what an auditor asks for.
//
//   Vans       Thermo King TracKing, built into TK fridge units
//              (cloud, readings up to every 5 min, REST API)
//              Thermo King TempuTrak, a standalone probe + GPS + door
//              sensor for any other fridge unit (every 15 min)
//
// Each vendor's payload is mapped into one Reading shape below. That
// mapping is the whole integration; everything above it is vendor-blind.
// ————————————————————————————————————————————————————————————————

import { ASSETS, evaluate, type Asset, type Reading as CheckReading, type Verdict } from "./checks";
import type { Status } from "./data";

// ————————————————————————— the contract —————————————————————————

export type Sample = {
  assetId: string;
  ts: number; // epoch ms
  celsius: number;
  humidity?: number; // %RH, conditioning room only
  door?: boolean; // door open at the time of the sample, where the sensor has a contact
};

export type Sensor = {
  id: string; // the vendor's own identifier for the device
  assetId: string;
  vendor: "testo" | "comark" | "disruptive" | "thermoking-tracking" | "thermoking-temputrak" | "simulated";
  model: string;
  intervalMins: number;
  battery?: number; // %
  signal?: "good" | "fair" | "poor";
  lastSeenTs: number;
  en12830: boolean;
};

export interface TelemetrySource {
  readonly name: string;
  readonly live: boolean; // true when readings arrive on their own; false for a one-off pull
  sensors(): Sensor[];
  // Samples for one asset since a moment, oldest first.
  history(assetId: string, sinceTs: number): Sample[];
  // The most recent sample for every asset.
  latest(): Map<string, Sample>;
}

// ————————————————————————— judging a sample —————————————————————————
//
// A telemetry sample is judged by the check engine's own rules, so the
// board here and the Checks desk never disagree. Excursion duration is
// worked out from the history: how long the reading has been outside
// the band, continuously, up to this sample.

export function outOfBandMins(asset: Asset, samples: Sample[]): number {
  if (samples.length === 0) return 0;
  const inBand = (s: Sample) => {
    const b = asset.band;
    if (b.min !== undefined && s.celsius < b.min) return false;
    if (b.max !== undefined && s.celsius > b.max) return false;
    return true;
  };
  let i = samples.length - 1;
  if (inBand(samples[i])) return 0;
  while (i > 0 && !inBand(samples[i - 1])) i--;
  return Math.round((samples[samples.length - 1].ts - samples[i].ts) / 60_000);
}

export function toCheckReading(asset: Asset, samples: Sample[]): CheckReading | undefined {
  const last = samples[samples.length - 1];
  if (!last) return undefined;
  return {
    id: `tele-${asset.id}-${last.ts}`,
    assetId: asset.id,
    minsAgo: Math.max(0, (Date.now() - last.ts) / 60_000),
    value: round1(last.celsius),
    value2: last.humidity !== undefined ? Math.round(last.humidity) : undefined,
    by: "telemetry",
    via: "auto",
    outOfBandMins: outOfBandMins(asset, samples),
  };
}

export type AssetLive = {
  asset: Asset;
  sensor?: Sensor;
  samples: Sample[]; // the window requested
  last?: Sample;
  reading?: CheckReading;
  verdict?: Verdict;
  status: Status;
  stale: boolean; // no sample within two reporting intervals
  minC?: number;
  maxC?: number;
};

export function board(source: TelemetrySource, windowMs: number): AssetLive[] {
  const since = Date.now() - windowMs;
  const sensors = new Map(source.sensors().map((s) => [s.assetId, s]));
  return ASSETS.filter((a) => a.kind !== "calibration").map((asset) => {
    const samples = source.history(asset.id, since);
    const sensor = sensors.get(asset.id);
    const last = samples[samples.length - 1];
    const reading = toCheckReading(asset, samples);
    const verdict = reading ? evaluate(asset, reading) : undefined;
    const stale = !last || (sensor ? Date.now() - last.ts > sensor.intervalMins * 2 * 60_000 : false);
    const status: Status = !last ? "overdue" : stale ? "due" : (verdict?.status ?? "ok");
    const temps = samples.map((s) => s.celsius);
    return {
      asset,
      sensor,
      samples,
      last,
      reading,
      verdict,
      status,
      stale,
      minC: temps.length ? round1(Math.min(...temps)) : undefined,
      maxC: temps.length ? round1(Math.max(...temps)) : undefined,
    };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ————————————————————————— the simulated source —————————————————————————
//
// Deterministic: the same asset at the same five-minute bucket always
// gives the same reading, so a reload shows the same 24 hours and the
// chart does not rewrite itself. The behaviour is what real freezers do:
//
//   · every freezer defrosts on a cycle, rising a few degrees for twenty
//     minutes and recovering
//   · a shop freezer gets opened; a van gets opened a lot, on the round
//   · Strete Gate has a compressor that started failing three hours ago
//     and is drifting up slowly — the excursion the rest of the demo
//     already talks about
//   · Van 2 had its doors open twelve minutes ago and is pulling back down

const BUCKET_MS = 5 * 60_000;

// A small, fast, seedable hash. Not for anything cryptographic; it only
// has to make the noise look like noise and stay the same on reload.
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

type Profile = {
  base: number;
  noise: number;
  defrostEveryH: number;
  defrostRise: number;
  door?: { everyMins: number; rise: number; recoverMins: number; activeHours?: [number, number] };
  humidityBase?: number;
};

const PROFILES: Record<string, Profile> = {
  "CS-A": { base: -22.4, noise: 0.25, defrostEveryH: 6, defrostRise: 3.5 },
  "CS-B": { base: -20.1, noise: 0.25, defrostEveryH: 6, defrostRise: 3.5 },
  "CH-1": { base: 16.2, noise: 0.15, defrostEveryH: 0, defrostRise: 0, humidityBase: 51 },
  "VAN-1": { base: -19.6, noise: 0.35, defrostEveryH: 8, defrostRise: 2.5, door: { everyMins: 22, rise: 5.5, recoverMins: 14, activeHours: [8, 16] } },
  "VAN-2": { base: -19.2, noise: 0.35, defrostEveryH: 8, defrostRise: 2.5, door: { everyMins: 35, rise: 6, recoverMins: 16, activeHours: [7, 17] } },
  "SF-ISL": { base: -18.9, noise: 0.3, defrostEveryH: 6, defrostRise: 3, door: { everyMins: 45, rise: 2.5, recoverMins: 10, activeHours: [10, 17] } },
  "SF-STG": { base: -18.6, noise: 0.3, defrostEveryH: 6, defrostRise: 3, door: { everyMins: 60, rise: 2, recoverMins: 10, activeHours: [10, 17] } },
  "SF-PUL": { base: -19.1, noise: 0.3, defrostEveryH: 6, defrostRise: 3, door: { everyMins: 40, rise: 2.5, recoverMins: 10, activeHours: [10, 17] } },
};

// Incidents are told relative to now, so the demo reads the same on any
// day: Strete Gate started drifting three hours ago; Van 2's doors were
// open twelve minutes ago.
const INCIDENTS = {
  "SF-STG": { startedAgoMins: 180, ratePerHour: 2.6 }, // −18.6 → about −11 over three hours
  "VAN-2": { doorAgoMins: 12, rise: 7.4, recoverMins: 22 },
};

function sampleAt(assetId: string, ts: number): Sample | undefined {
  const p = PROFILES[assetId];
  if (!p) return undefined;
  const bucket = Math.floor(ts / BUCKET_MS);
  const t = bucket * BUCKET_MS;
  const now = Date.now();
  const d = new Date(t);
  const hour = d.getHours() + d.getMinutes() / 60;

  let c = p.base;

  // noise
  c += (hash(`${assetId}:${bucket}`) - 0.5) * 2 * p.noise;

  // defrost: a 20-minute rise every N hours, offset per asset so they
  // are not all defrosting at once
  if (p.defrostEveryH > 0) {
    const period = p.defrostEveryH * 60;
    const offset = Math.floor(hash(`${assetId}:defrost`) * period);
    const minuteOfDay = (Math.floor(t / 60_000) + offset) % period;
    if (minuteOfDay < 20) {
      const k = minuteOfDay / 20;
      c += p.defrostRise * Math.sin(k * Math.PI);
    }
  }

  // door openings during working hours, recovering over a few samples
  if (p.door) {
    const [h0, h1] = p.door.activeHours ?? [0, 24];
    if (hour >= h0 && hour <= h1) {
      const period = p.door.everyMins;
      const offset = Math.floor(hash(`${assetId}:door`) * period);
      const m = (Math.floor(t / 60_000) + offset) % period;
      if (m < p.door.recoverMins) {
        const k = 1 - m / p.door.recoverMins;
        c += p.door.rise * k * k;
      }
    }
  }

  // incidents
  const inc = INCIDENTS[assetId as keyof typeof INCIDENTS];
  if (inc && "startedAgoMins" in inc) {
    const started = now - inc.startedAgoMins * 60_000;
    if (t >= started) c += ((t - started) / 3_600_000) * inc.ratePerHour;
  }
  if (inc && "doorAgoMins" in inc) {
    const opened = now - inc.doorAgoMins * 60_000;
    const since = (t - opened) / 60_000;
    if (since >= 0 && since < inc.recoverMins) {
      const k = 1 - since / inc.recoverMins;
      c += inc.rise * k * k;
    }
  }

  const out: Sample = { assetId, ts: t, celsius: Math.round(c * 10) / 10 };
  if (p.humidityBase !== undefined) out.humidity = Math.round(p.humidityBase + (hash(`${assetId}:rh:${bucket}`) - 0.5) * 6);
  return out;
}

export class SimulatedSource implements TelemetrySource {
  readonly name = "Simulated telemetry";
  readonly live = true;

  sensors(): Sensor[] {
    const now = Date.now();
    const premises = (assetId: string, id: string): Sensor => ({
      id,
      assetId,
      vendor: "simulated",
      model: "testo 160 TH (simulated)",
      intervalMins: 5,
      battery: 60 + Math.floor(hash(`${assetId}:batt`) * 38),
      signal: "good",
      lastSeenTs: now - Math.floor(hash(`${assetId}:seen`) * 4) * 60_000,
      en12830: true,
    });
    const van = (assetId: string, id: string): Sensor => ({
      id,
      assetId,
      vendor: "simulated",
      model: "Thermo King TempuTrak (simulated)",
      intervalMins: 5,
      signal: hash(`${assetId}:sig`) > 0.3 ? "good" : "fair",
      lastSeenTs: now - Math.floor(hash(`${assetId}:seen`) * 4) * 60_000,
      en12830: true,
    });
    return [
      premises("CS-A", "T160-3A21F0"),
      premises("CS-B", "T160-3A21F1"),
      premises("CH-1", "T160-3A2201"),
      premises("SF-ISL", "T160-3A2318"),
      premises("SF-STG", "T160-3A2319"),
      premises("SF-PUL", "T160-3A2320"),
      van("VAN-1", "TPT-88410"),
      van("VAN-2", "TPT-88411"),
    ];
  }

  history(assetId: string, sinceTs: number): Sample[] {
    const out: Sample[] = [];
    const start = Math.floor(sinceTs / BUCKET_MS) * BUCKET_MS;
    const end = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
    for (let t = start; t <= end; t += BUCKET_MS) {
      const s = sampleAt(assetId, t);
      if (s) out.push(s);
    }
    return out;
  }

  latest(): Map<string, Sample> {
    const m = new Map<string, Sample>();
    for (const id of Object.keys(PROFILES)) {
      const s = sampleAt(id, Date.now());
      if (s) m.set(id, s);
    }
    return m;
  }
}

// ————————————————————————— vendor mapping —————————————————————————
//
// Each real vendor's payload becomes the Sample above. These are the
// only functions that know a vendor's field names. They are written
// against the documented shapes and will need checking against a live
// account, which is exactly the point of keeping them this small.
//
// The sensor-to-asset mapping (which logger is in which freezer) is
// configuration, not code: a table of vendor sensor id → asset id.

export type SensorMap = Record<string, string>; // vendor sensor id → asset id

// testo Cloud (160/162 series). Measurements arrive per device, per
// channel, with ISO timestamps. Channel 1 is temperature; a TH logger
// reports humidity on channel 2.
export function fromTesto(payload: { deviceId: string; channels: { channel: number; unit: string; values: { ts: string; value: number }[] }[] }, map: SensorMap): Sample[] {
  const assetId = map[payload.deviceId];
  if (!assetId) return [];
  const temp = payload.channels.find((c) => c.unit === "°C" || c.channel === 1);
  const rh = payload.channels.find((c) => c.unit === "%RH" || c.channel === 2);
  if (!temp) return [];
  return temp.values.map((v) => {
    const ts = Date.parse(v.ts);
    const h = rh?.values.find((x) => Date.parse(x.ts) === ts);
    return { assetId, ts, celsius: v.value, humidity: h?.value };
  });
}

// Comark RF500 (Comark Cloud). Readings are per transmitter with a
// numeric epoch and a temperature; door contacts appear as a boolean
// input where the transmitter has one.
export function fromComark(payload: { transmitterId: string; readings: { epoch: number; temperature: number; door?: boolean }[] }, map: SensorMap): Sample[] {
  const assetId = map[payload.transmitterId];
  if (!assetId) return [];
  return payload.readings.map((r) => ({ assetId, ts: r.epoch * 1000, celsius: r.temperature, door: r.door }));
}

// Disruptive Technologies Data Connector: one event per HTTP POST, with
// a device name and a temperature event carrying its own sample time.
export function fromDisruptive(event: { targetName: string; eventType: string; data: { temperature?: { value: number; updateTime: string } } }, map: SensorMap): Sample[] {
  if (event.eventType !== "temperature" || !event.data.temperature) return [];
  const deviceId = event.targetName.split("/").pop() ?? event.targetName;
  const assetId = map[deviceId];
  if (!assetId) return [];
  return [{ assetId, ts: Date.parse(event.data.temperature.updateTime), celsius: event.data.temperature.value }];
}

// Thermo King TracKing / TempuTrak: per-asset records with a return-air
// or probe temperature, a door state, and a position. Only the
// temperature and door are taken here; position belongs to the fleet
// view, not the cold chain.
export function fromThermoKing(payload: { assetId: string; records: { timestamp: string; temperature: number; doorOpen?: boolean }[] }, map: SensorMap): Sample[] {
  const assetId = map[payload.assetId];
  if (!assetId) return [];
  return payload.records.map((r) => ({ assetId, ts: Date.parse(r.timestamp), celsius: r.temperature, door: r.doorOpen }));
}

// ————————————————————————— the active source —————————————————————————
//
// One place to swap. When a vendor adapter exists it goes here, and the
// desk needs no other change.
export const source: TelemetrySource = new SimulatedSource();
