"use client";

// ————————————————————————————————————————————————————————————————
// The cold chain desk. Live temperatures from every monitored asset,
// judged by the same rules the check engine uses. Cards for the estate,
// a 24-hour chart for any one of them, and the sensor behind it.
//
// Charts are plain SVG. Nothing to load, nothing to configure, and they
// render the same everywhere.
// ————————————————————————————————————————————————————————————————

import { useEffect, useMemo, useState } from "react";
import { source, board, type AssetLive, type Sample } from "./telemetry";
import { REGIME_LABEL } from "./stock";
import type { Status } from "./data";

const GREEN = "#167a5b";
const BRASS = "#a3772a";
const VERM = "#c22f4e";
const MUTED = "#6f7482";
const NAVY = "#10284a";

const STATUS_COLOR: Record<Status, string> = { ok: GREEN, due: BRASS, overdue: VERM };
const STATUS_WORD: Record<Status, string> = { ok: "In spec", due: "Watch", overdue: "Excursion" };

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)", fontWeight: 500, letterSpacing: "-0.01em" };
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const card: React.CSSProperties = { background: "var(--bg-elevated)", border: "1px solid var(--rule)", borderRadius: 12, padding: "14px 18px" };

const HOUR = 3_600_000;

function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ ...serif, fontSize: 30, lineHeight: 1.08, color: "var(--text)", marginBottom: sub ? 8 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 14.5, color: MUTED, maxWidth: 580, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)}h ago`;
}

// ————————————————————————— the desk —————————————————————————

export default function MonitorDesk() {
  const [, tick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [window_, setWindow] = useState<6 | 24 | 72>(24);

  // The board re-reads the source every thirty seconds. With a real
  // adapter this is where new samples arrive; with the simulator it is
  // where the next five-minute bucket comes in.
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const rows = useMemo(() => board(source, window_ * HOUR), [window_]);
  const counts = useMemo(() => {
    const c = { ok: 0, due: 0, overdue: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);
  const lastSeen = Math.max(...rows.map((r) => r.last?.ts ?? 0));
  const detail = open ? rows.find((r) => r.asset.id === open) : null;

  const groups: [string, AssetLive[]][] = [
    ["Factory", rows.filter((r) => r.asset.cls === "coldstore" || r.asset.cls === "conditioning")],
    ["Vehicles", rows.filter((r) => r.asset.cls === "vehicle")],
    ["Shops", rows.filter((r) => r.asset.cls === "shop-freezer")],
  ];

  return (
    <>
      <Title
        title="Cold chain"
        sub="Every coldstore, conditioning room, shop freezer and van, read remotely and judged against its own limits — the same limits a person with a probe would use. An excursion shows here the moment a sensor reports it, with how long it has been going on."
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <Tally n={counts.overdue} label="Excursions" color={VERM} />
        <Tally n={counts.due} label="Watch" color={BRASS} />
        <Tally n={counts.ok} label="In spec" color={GREEN} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {([6, 24, 72] as const).map((h) => (
            <button
              key={h}
              onClick={() => setWindow(h)}
              style={{ font: "inherit", fontSize: 12.5, padding: "6px 11px", border: "1px solid var(--rule)", borderRadius: 8, background: window_ === h ? "rgba(16,40,74,0.08)" : "none", color: "inherit", cursor: "pointer", fontWeight: window_ === h ? 600 : 400 }}
            >
              {h === 72 ? "3 days" : `${h}h`}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>
          <span aria-hidden style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: GREEN, marginRight: 6 }} />
          {source.name} · last reading {lastSeen ? ago(lastSeen) : "—"}
        </p>
      </div>

      {groups.map(([name, list]) => (
        <div key={name} style={{ marginBottom: 22 }}>
          <h2 style={{ ...serif, fontSize: 18, color: "var(--text)", marginBottom: 10 }}>{name}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {list.map((r) => (
              <AssetCard key={r.asset.id} r={r} onOpen={() => setOpen(r.asset.id)} />
            ))}
          </div>
        </div>
      ))}

      <Integration />

      {detail && <Detail r={detail} hours={window_} onClose={() => setOpen(null)} />}
    </>
  );
}

function Tally({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ ...card, padding: "9px 14px", minWidth: 96 }}>
      <p style={{ ...mono, fontSize: 22, fontWeight: 500, color, lineHeight: 1.1 }}>{n}</p>
      <p style={{ fontSize: 11.5, color: MUTED }}>{label}</p>
    </div>
  );
}

// ————————————————————————— a card —————————————————————————

function AssetCard({ r, onOpen }: { r: AssetLive; onOpen: () => void }) {
  const color = STATUS_COLOR[r.status];
  const unit = r.asset.band.unit;
  return (
    <button
      onClick={onOpen}
      style={{ ...card, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", borderLeft: `3px solid ${color}`, padding: "12px 14px 10px", display: "grid", gap: 6 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3 }}>{r.asset.name}</span>
        <span style={{ fontSize: 11.5, color, whiteSpace: "nowrap" }}>{r.stale ? "No signal" : STATUS_WORD[r.status]}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <span style={{ ...mono, fontSize: 28, fontWeight: 500, color, lineHeight: 1 }}>
          {r.last ? `${r.last.celsius}${unit}` : "—"}
          {r.last?.humidity !== undefined && <span style={{ fontSize: 13, color: MUTED, marginLeft: 6 }}>{r.last.humidity}%RH</span>}
        </span>
        <div style={{ flex: 1 }}>
          <Sparkline samples={r.samples} band={r.asset.band} color={color} height={34} />
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: r.status === "overdue" ? VERM : MUTED, lineHeight: 1.45 }}>
        {r.verdict && r.status !== "ok" ? r.verdict.reason.split(/(?<=\.)\s/)[0] : `Limit ${bandWord(r.asset.band)} · range ${r.minC}${unit} to ${r.maxC}${unit}`}
      </p>
    </button>
  );
}

function bandWord(b: { min?: number; max?: number; unit: string }): string {
  if (b.min !== undefined && b.max !== undefined) return `${b.min} to ${b.max}${b.unit}`;
  if (b.max !== undefined) return `≤ ${b.max}${b.unit}`;
  if (b.min !== undefined) return `≥ ${b.min}${b.unit}`;
  return "none";
}

// ————————————————————————— charts —————————————————————————

function scale(samples: Sample[], band: { min?: number; max?: number }) {
  const temps = samples.map((s) => s.celsius);
  const lo = Math.min(...temps, band.max ?? Infinity, band.min ?? Infinity) - 1.5;
  const hi = Math.max(...temps, band.max ?? -Infinity, band.min ?? -Infinity) + 1.5;
  const t0 = samples[0]?.ts ?? 0;
  const t1 = samples[samples.length - 1]?.ts ?? 1;
  return { lo, hi, t0, t1 };
}

function Sparkline({ samples, band, color, height }: { samples: Sample[]; band: { min?: number; max?: number }; color: string; height: number }) {
  if (samples.length < 2) return null;
  const W = 120, H = height;
  const { lo, hi, t0, t1 } = scale(samples, band);
  const x = (ts: number) => ((ts - t0) / (t1 - t0 || 1)) * W;
  const y = (c: number) => H - ((c - lo) / (hi - lo || 1)) * H;
  const path = samples.map((s, i) => `${i ? "L" : "M"}${x(s.ts).toFixed(1)},${y(s.celsius).toFixed(1)}`).join(" ");
  const bandTop = y(band.max ?? hi);
  const bandBot = y(band.min ?? lo);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden>
      <rect x={0} y={Math.min(bandTop, bandBot)} width={W} height={Math.abs(bandBot - bandTop)} fill={GREEN} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Chart({ r, hours }: { r: AssetLive; hours: number }) {
  const { samples, asset } = r;
  if (samples.length < 2) return <p style={{ fontSize: 13, color: MUTED }}>No readings in this window.</p>;
  const W = 720, H = 220, PL = 40, PB = 26, PT = 10, PR = 12;
  const { lo, hi, t0, t1 } = scale(samples, asset.band);
  const x = (ts: number) => PL + ((ts - t0) / (t1 - t0 || 1)) * (W - PL - PR);
  const y = (c: number) => PT + (H - PT - PB) - ((c - lo) / (hi - lo || 1)) * (H - PT - PB);
  const path = samples.map((s, i) => `${i ? "L" : "M"}${x(s.ts).toFixed(1)},${y(s.celsius).toFixed(1)}`).join(" ");
  const bandTop = y(asset.band.max ?? hi), bandBot = y(asset.band.min ?? lo);

  // Out-of-band runs, shaded red, so the eye lands on the excursion.
  const runs: [number, number][] = [];
  let start: number | null = null;
  const inBand = (s: Sample) => (asset.band.min === undefined || s.celsius >= asset.band.min) && (asset.band.max === undefined || s.celsius <= asset.band.max);
  samples.forEach((s, i) => {
    if (!inBand(s) && start === null) start = s.ts;
    if (inBand(s) && start !== null) { runs.push([start, s.ts]); start = null; }
    if (i === samples.length - 1 && start !== null) runs.push([start, s.ts]);
  });

  const ticks = hours <= 6 ? 6 : hours <= 24 ? 6 : 6;
  const yTicks = 4;
  const fmtT = (ts: number) => {
    const d = new Date(ts);
    return hours > 24 ? `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}h` : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: 760 }} role="img" aria-label={`${asset.name} temperature over ${hours} hours`}>
      <rect x={PL} y={Math.min(bandTop, bandBot)} width={W - PL - PR} height={Math.abs(bandBot - bandTop)} fill={GREEN} opacity={0.08} />
      {runs.map(([a, b], i) => (
        <rect key={i} x={x(a)} y={PT} width={Math.max(2, x(b) - x(a))} height={H - PT - PB} fill={VERM} opacity={0.08} />
      ))}
      {Array.from({ length: yTicks + 1 }, (_, i) => lo + ((hi - lo) * i) / yTicks).map((v, i) => (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth={0.6} />
          <text x={PL - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily="var(--font-mono)">{v.toFixed(0)}</text>
        </g>
      ))}
      {asset.band.max !== undefined && <line x1={PL} x2={W - PR} y1={y(asset.band.max)} y2={y(asset.band.max)} stroke={GREEN} strokeWidth={0.9} strokeDasharray="4 3" />}
      {asset.band.min !== undefined && <line x1={PL} x2={W - PR} y1={y(asset.band.min)} y2={y(asset.band.min)} stroke={GREEN} strokeWidth={0.9} strokeDasharray="4 3" />}
      {Array.from({ length: ticks + 1 }, (_, i) => t0 + ((t1 - t0) * i) / ticks).map((ts, i) => (
        <text key={i} x={x(ts)} y={H - 8} textAnchor={i === 0 ? "start" : i === ticks ? "end" : "middle"} fontSize={10} fill={MUTED} fontFamily="var(--font-mono)">{fmtT(ts)}</text>
      ))}
      <path d={path} fill="none" stroke={NAVY} strokeWidth={1.6} />
      {r.last && <circle cx={x(r.last.ts)} cy={y(r.last.celsius)} r={3.5} fill={STATUS_COLOR[r.status]} />}
    </svg>
  );
}

// ————————————————————————— detail —————————————————————————

function Detail({ r, hours, onClose }: { r: AssetLive; hours: number; onClose: () => void }) {
  const { asset, sensor } = r;
  const color = STATUS_COLOR[r.status];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,27,51,0.45)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 16, padding: "24px 28px", maxWidth: 820, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>{asset.id} · {asset.site} · {REGIME_LABEL[asset.cls === "conditioning" ? "conditioned" : "frozen"]}</p>
            <h2 style={{ ...serif, fontSize: 24, color: "var(--text)", lineHeight: 1.1 }}>{asset.name}</h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ ...mono, fontSize: 30, fontWeight: 500, color, lineHeight: 1 }}>
              {r.last ? `${r.last.celsius}${asset.band.unit}` : "—"}
            </p>
            <p style={{ fontSize: 12, color, marginTop: 4 }}>{STATUS_WORD[r.status]}{r.last ? ` · ${ago(r.last.ts)}` : ""}</p>
          </div>
        </div>

        {r.verdict && r.status !== "ok" && (
          <div style={{ ...card, borderLeft: `2px solid ${color}`, marginBottom: 14 }}>
            <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{r.verdict.reason}</p>
            {r.reading?.outOfBandMins ? <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 4 }}>Outside limit for {r.reading.outOfBandMins} min · tolerance {asset.band.toleranceMins} min</p> : null}
          </div>
        )}

        <Chart r={r} hours={hours} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 16 }}>
          <Fact k="Limit" v={bandWord(asset.band)} />
          <Fact k={`Range, ${hours}h`} v={`${r.minC} to ${r.maxC}${asset.band.unit}`} />
          <Fact k="Tolerance" v={`${asset.band.toleranceMins} min outside limit`} />
          <Fact k="Hard breach" v={asset.band.hardBreach !== undefined ? `${asset.band.hardBreach}${asset.band.unit} beyond limit` : "—"} />
        </div>

        {sensor && (
          <>
            <h3 style={{ ...serif, fontSize: 16, color: "var(--text)", margin: "20px 0 8px" }}>Sensor</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <Fact k="Device" v={sensor.model} />
              <Fact k="Identifier" v={sensor.id} mono />
              <Fact k="Reports every" v={`${sensor.intervalMins} min`} />
              <Fact k="Last seen" v={ago(sensor.lastSeenTs)} />
              {sensor.battery !== undefined && <Fact k="Battery" v={`${sensor.battery}%`} />}
              {sensor.signal && <Fact k="Signal" v={sensor.signal} />}
              <Fact k="Standard" v={sensor.en12830 ? "EN 12830" : "Not certified"} />
            </div>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <button onClick={onClose} style={{ font: "inherit", fontSize: 13, padding: "7px 14px", border: "1px solid var(--rule-strong)", borderRadius: 8, background: "none", color: "inherit", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v, mono: isMono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ ...card, padding: "9px 13px" }}>
      <p style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>{k}</p>
      <p style={{ fontSize: 13.5, ...(isMono ? mono : {}) }}>{v}</p>
    </div>
  );
}

// ————————————————————————— integration —————————————————————————

function Integration() {
  const sensors = source.sensors();
  return (
    <div style={{ ...card, marginTop: 8 }}>
      <h2 style={{ ...serif, fontSize: 17, color: "var(--text)", marginBottom: 6 }}>Where the readings come from</h2>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, maxWidth: 640, marginBottom: 12 }}>
        This desk reads from a telemetry source through one interface, and judges every reading with the same rules the Checks desk uses. The source running now is a simulation that behaves like real hardware. Swapping it for real loggers is a matter of which of these is installed:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 12 }}>
        <Vendor name="testo 160 / 162" where="Coldstores, shop freezers, conditioning room" how="WiFi loggers reporting to Testo Cloud. Read by API on a schedule." />
        <Vendor name="Comark RF500" where="Coldstores, shop freezers" how="Mesh transmitters through a gateway to Comark Cloud. Read by API." />
        <Vendor name="Disruptive Technologies" where="Any premises" how="Small wireless sensors. Readings pushed to us by webhook as they happen." />
        <Vendor name="Thermo King TracKing / TempuTrak" where="Vans" how="Built into TK fridge units, or a standalone probe for any other unit. Reports with position and door state." />
      </div>
      <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, maxWidth: 640 }}>
        {sensors.length} sensors mapped to {sensors.length} assets. The mapping from a device identifier to an asset is configuration, not code — a logger moved to a different freezer is a one-line change.
      </p>
    </div>
  );
}

function Vendor({ name, where, how }: { name: string; where: string; how: string }) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid var(--rule)", borderRadius: 10, background: "var(--bg)" }}>
      <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{name}</p>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{where}</p>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{how}</p>
    </div>
  );
}
