"use client";

// ————————————————————————————————————————————————————————————————
// Provenance — the check desk.
//
// The live board for every monitored asset, the exception queue, and the
// form for recording a check. One screen answers the two questions a
// food producer is actually asked at audit: is everything in spec right
// now, and can you prove it was in spec at the time.
//
// Style tokens are declared locally so this file stands alone. They
// mirror ProvenanceApp's palette; when the shared ui module lands these
// come out.
// ————————————————————————————————————————————————————————————————

import { useMemo, useState } from "react";
import type { Status } from "./data";
import {
  ASSETS,
  SEED_READINGS,
  boardState,
  exceptions,
  evaluate,
  clockLabel,
  fmtAgo,
  assetById,
  type Reading,
  type AssetState,
} from "./checks";

const GREEN = "#167a5b";
const BRASS = "#a3772a";
const VERM = "#c22f4e";
const MUTED = "#6f7482";

const STATUS_COLOR: Record<Status, string> = { ok: GREEN, due: BRASS, overdue: VERM };
const STATUS_WORD: Record<Status, string> = { ok: "In spec", due: "Watch", overdue: "Exception" };

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const serifItal: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontWeight: 500,
  letterSpacing: "-0.01em",
};

const CLASS_WORD: Record<string, string> = {
  coldstore: "Coldstore",
  "shop-freezer": "Shop freezer",
  vehicle: "Vehicle",
  conditioning: "Conditioning",
  instrument: "Instrument",
};

function Dot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 99,
        background: STATUS_COLOR[status],
        marginRight: 8,
        flexShrink: 0,
      }}
    />
  );
}

function SectionTitle({ title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ ...serifItal, fontSize: 30, lineHeight: 1.08, color: "var(--text)", marginBottom: sub ? 8 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 14.5, color: MUTED, maxWidth: 580, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--rule)",
  borderRadius: 12,
  padding: "14px 18px",
};

// ————————————————————————— the desk —————————————————————————

export default function CheckDesk({ operator = "" }: { operator?: string }) {
  const [readings, setReadings] = useState<Reading[]>(SEED_READINGS);
  const [openAsset, setOpenAsset] = useState<string | null>(null);
  const [recording, setRecording] = useState<string | null>(null);

  const board = useMemo(() => boardState(readings), [readings]);
  const queue = useMemo(() => exceptions(readings), [readings]);

  const counts = useMemo(() => {
    const c = { ok: 0, due: 0, overdue: 0 };
    for (const b of board) c[b.status] += 1;
    return c;
  }, [board]);

  function record(r: Reading) {
    setReadings((prev) => [r, ...prev]);
    setRecording(null);
  }

  const detail = openAsset ? board.find((b) => b.asset.id === openAsset) : null;

  return (
    <>
      <SectionTitle
        kicker="Monitoring"
        title="Checks"
        sub="Every freezer, vehicle, conditioning room and instrument on one board. Each reading is measured against that asset's own limits, timed against its own schedule, and kept as a record — so an excursion raises an alert while there's still stock to save, and the log stands up afterwards."
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <Tally n={counts.overdue} label="Exceptions" color={VERM} />
        <Tally n={counts.due} label="Watch" color={BRASS} />
        <Tally n={counts.ok} label="In spec" color={GREEN} />
      </div>

      {queue.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
            NEEDS ATTENTION
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {queue.map((e) => (
              <div
                key={e.assetId}
                style={{
                  ...card,
                  borderLeft: `2px solid ${STATUS_COLOR[e.status]}`,
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>
                    <Dot status={e.status} />
                    {e.assetName}
                  </p>
                  <span style={{ ...mono, fontSize: 11.5, color: MUTED }}>
                    {e.site} · {e.at}
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: e.breach ? VERM : MUTED, paddingLeft: 16, marginTop: 3, lineHeight: 1.5 }}>
                  {e.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
        ALL ASSETS
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {board.map((b) => (
          <AssetRow
            key={b.asset.id}
            state={b}
            onOpen={() => setOpenAsset(b.asset.id)}
            onRecord={() => setRecording(b.asset.id)}
          />
        ))}
      </div>

      {detail && <AssetDetail state={detail} readings={readings} onClose={() => setOpenAsset(null)} />}
      {recording && <RecordForm assetId={recording} defaultBy={operator} onCancel={() => setRecording(null)} onSave={record} />}
    </>
  );
}

function Tally({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ ...card, padding: "10px 16px", minWidth: 110 }}>
      <p style={{ ...mono, fontSize: 24, fontWeight: 500, color, lineHeight: 1.1 }}>{n}</p>
      <p style={{ fontSize: 11.5, color: MUTED }}>{label}</p>
    </div>
  );
}

function AssetRow({
  state,
  onOpen,
  onRecord,
}: {
  state: AssetState;
  onOpen: () => void;
  onRecord: () => void;
}) {
  const { asset, last, verdict, due, status } = state;
  const unit = asset.band.unit;

  const value =
    last === undefined
      ? "—"
      : asset.kind === "calibration"
        ? `${last.value}${unit === "g" ? "g" : unit}`
        : `${last.value}${unit}`;

  return (
    <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center" }}>
      <div>
        <p style={{ fontSize: 14.5, marginBottom: 2 }}>
          <Dot status={status} />
          {asset.name}
        </p>
        <p style={{ fontSize: 12.5, color: status === "overdue" ? VERM : MUTED, paddingLeft: 16, lineHeight: 1.5 }}>
          {verdict && verdict.status !== "ok" ? verdict.reason : due.reason}
        </p>
        <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 3, letterSpacing: "0.05em" }}>
          {asset.id} · {CLASS_WORD[asset.cls]} · {asset.site} · every {asset.everyHours}h
        </p>
      </div>

      <span style={{ ...mono, fontSize: 19, fontWeight: 500, color: STATUS_COLOR[status], whiteSpace: "nowrap" }}>
        {value}
        {last?.value2 !== undefined && (
          <span style={{ fontSize: 13, color: MUTED }}> · {last.value2}%RH</span>
        )}
      </span>

      <div style={{ display: "grid", gap: 5 }}>
        <button onClick={onRecord} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>
          Record
        </button>
        <button
          onClick={onOpen}
          style={{
            fontSize: 11.5,
            color: MUTED,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textAlign: "center",
          }}
        >
          History
        </button>
      </div>
    </div>
  );
}

function AssetDetail({
  state,
  readings,
  onClose,
}: {
  state: AssetState;
  readings: Reading[];
  onClose: () => void;
}) {
  const { asset } = state;
  const mine = readings
    .filter((r) => r.assetId === asset.id)
    .sort((a, b) => a.minsAgo - b.minsAgo);

  return (
    <Overlay onClose={onClose}>
      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 6 }}>
        {asset.id} · {CLASS_WORD[asset.cls].toUpperCase()}
      </p>
      <h2 style={{ ...serifItal, fontSize: 26, marginBottom: 6 }}>{asset.name}</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.55 }}>
        {asset.site} · checked every {asset.everyHours}h ·{" "}
        {asset.kind === "calibration"
          ? `±${asset.band.max}${asset.band.unit} of test weight`
          : bandWords(asset.band.min, asset.band.max, asset.band.unit)}
        {asset.band2 &&
          ` · ${asset.band2.label.toLowerCase()} ${bandWords(asset.band2.min, asset.band2.max, asset.band2.unit)}`}
        {asset.band.toleranceMins > 0 && ` · ${asset.band.toleranceMins} min tolerance`}
      </p>

      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
        RECORD
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {mine.length === 0 && <p style={{ fontSize: 13, color: MUTED }}>No checks recorded against this asset.</p>}
        {mine.map((r) => {
          const v = evaluate(asset, r);
          return (
            <div key={r.id} style={{ ...card, padding: "11px 15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <p style={{ fontSize: 13.5 }}>
                  <Dot status={v.status} />
                  <span style={{ ...mono, fontWeight: 500, color: STATUS_COLOR[v.status] }}>
                    {r.value}
                    {asset.band.unit}
                    {r.value2 !== undefined && ` · ${r.value2}%RH`}
                  </span>
                  <span style={{ color: MUTED }}> · {STATUS_WORD[v.status]}</span>
                </p>
                <span style={{ ...mono, fontSize: 11.5, color: MUTED }}>
                  {clockLabel(r.minsAgo)} · {fmtAgo(r.minsAgo)} ago
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, marginTop: 3, lineHeight: 1.5 }}>{v.reason}</p>
              <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 3 }}>
                {r.by} · {r.via === "voice" ? "voice capture" : r.via === "auto" ? "instrument feed" : "keyed"}
                {r.note ? ` · ${r.note}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </Overlay>
  );
}

function bandWords(min: number | undefined, max: number | undefined, unit: string): string {
  if (min !== undefined && max !== undefined) return `${min} to ${max}${unit}`;
  if (max !== undefined) return `at or below ${max}${unit}`;
  if (min !== undefined) return `at or above ${min}${unit}`;
  return "no limit";
}

function RecordForm({
  assetId,
  defaultBy = "",
  onCancel,
  onSave,
}: {
  assetId: string;
  defaultBy?: string;
  onCancel: () => void;
  onSave: (r: Reading) => void;
}) {
  const asset = assetById(assetId)!;
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [expected, setExpected] = useState(asset.kind === "calibration" ? "1000" : "");
  const [mins, setMins] = useState("0");
  const [by, setBy] = useState(defaultBy);
  const [note, setNote] = useState("");

  const parsed = parseFloat(value);
  const valid = !Number.isNaN(parsed) && by.trim().length > 0;

  // Live verdict as the reading is typed — the person recording sees the
  // consequence before they commit it, not afterwards.
  const preview: Reading | null = valid
    ? {
        id: "preview",
        assetId,
        minsAgo: 0,
        value: parsed,
        value2: value2 ? parseFloat(value2) : undefined,
        expected: expected ? parseFloat(expected) : undefined,
        by,
        via: "manual",
        outOfBandMins: parseFloat(mins) || 0,
      }
    : null;
  const verdict = preview ? evaluate(asset, preview) : null;

  function submit() {
    if (!preview) return;
    onSave({ ...preview, id: `r-${Date.now()}`, note: note.trim() || undefined });
  }

  return (
    <Overlay onClose={onCancel}>
      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 6 }}>
        RECORD A CHECK
      </p>
      <h2 style={{ ...serifItal, fontSize: 24, marginBottom: 18 }}>{asset.name}</h2>

      <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <Field
          label={asset.kind === "calibration" ? `Scale reading (${asset.band.unit})` : `Reading (${asset.band.unit})`}
          value={value}
          onChange={setValue}
          placeholder={asset.kind === "calibration" ? "1002.4" : "-19.4"}
        />

        {asset.kind === "calibration" && (
          <Field label="Test weight (g)" value={expected} onChange={setExpected} placeholder="1000" />
        )}

        {asset.band2 && (
          <Field
            label={`${asset.band2.label} (${asset.band2.unit})`}
            value={value2}
            onChange={setValue2}
            placeholder="51"
          />
        )}

        {asset.kind !== "calibration" && (
          <Field
            label="Minutes already outside limit (0 if in spec)"
            value={mins}
            onChange={setMins}
            placeholder="0"
          />
        )}

        <Field label="Checked by" value={by} onChange={setBy} placeholder="M. Reeve" />
        <Field label="Note (optional)" value={note} onChange={setNote} placeholder="Door-open spike, recovering" />
      </div>

      {verdict && (
        <div
          style={{
            ...card,
            borderLeft: `2px solid ${STATUS_COLOR[verdict.status]}`,
            marginBottom: 18,
          }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 500 }}>
            <Dot status={verdict.status} />
            {STATUS_WORD[verdict.status]}
          </p>
          <p style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, marginTop: 3, lineHeight: 1.5 }}>
            {verdict.reason}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={!valid} className="btn btn-primary" style={{ opacity: valid ? 1 : 0.45 }}>
          Sign off and record
        </button>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
        Recorded checks cannot be edited or deleted. A mistaken entry is corrected by recording a further check, so the
        original stands in the log.
      </p>
    </Overlay>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 4 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...mono,
          width: "100%",
          fontSize: 14,
          padding: "8px 11px",
          border: "1px solid var(--rule)",
          borderRadius: 8,
          background: "var(--bg)",
          color: "inherit",
        }}
      />
    </label>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,63,71,0.42)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--rule)",
          borderRadius: 16,
          padding: "26px 28px",
          maxWidth: 620,
          width: "100%",
          maxHeight: "84vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
