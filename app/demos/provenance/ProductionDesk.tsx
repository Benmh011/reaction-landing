"use client";

// ————————————————————————————————————————————————————————————————
// The production desk.
//
// One row per batch, worst first, each opening onto the evidence that
// made it safe: the heat treatment, the detector challenges, the fill
// weights. A release line at the top of each says in one sentence
// whether the batch can go out, which is the only question anybody is
// actually asking.
//
// Every verdict is derived at render from the reading against the limit.
// Nothing here stores a pass.
// ————————————————————————————————————————————————————————————————

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { readChart, toPasteurisation, type ChartRead } from "./chart";
import {
  SEED_BATCHES,
  loadBatches,
  saveBatches,
  judgePasteurisation,
  batchStates,
  batchDate,
  batchDayLabel,
  judgeFill,
  tne,
  METAL_LIMITS,
  PASTEURISATION,
  type Batch,
  type BatchState,
} from "./production";
import { batchRecordBlob, batchRecordFilename, download } from "./records-pdf";
import type { Status } from "./data";

const GREEN = "#167a5b";
const BRASS = "#a3772a";
const VERM = "#c22f4e";
const MUTED = "var(--text-muted)";
const STATUS_COLOR: Record<Status, string> = { ok: GREEN, due: BRASS, overdue: VERM };

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)" };
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const card: React.CSSProperties = {
  border: "1px solid var(--rule)",
  borderRadius: 12,
  padding: "14px 18px",
  background: "var(--bg-elevated)",
};

function col(width: number): React.CSSProperties {
  return { width, flexShrink: 0, textAlign: "right" };
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid var(--rule)",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: MUTED, marginBottom: 8 }}>
        {title.toUpperCase()}
      </p>
      {children}
    </div>
  );
}

function Line({ status, text }: { status: Status; text: string }) {
  return (
    <p style={{ fontSize: 13, color: STATUS_COLOR[status], lineHeight: 1.55, marginBottom: 8 }}>{text}</p>
  );
}

function Tally({ n, label, color = "var(--text)" }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ ...card, padding: "10px 16px" }}>
      <p style={{ ...mono, fontSize: 22, fontWeight: 500, color, lineHeight: 1.1 }}>{n}</p>
      <p style={{ fontSize: 11.5, color: MUTED }}>{label}</p>
    </div>
  );
}

function ExportButton({ label, build }: { label: string; build: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await build();
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="btn btn-primary"
      style={{ fontSize: 13, padding: "7px 14px", whiteSpace: "nowrap" }}
    >
      {busy ? "Preparing\u2026" : label}
    </button>
  );
}

function Pills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", color: MUTED, marginBottom: 6 }}>
        {label.toUpperCase()}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map(([v, l]) => {
          const on = v === value;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 99,
                cursor: "pointer",
                border: `1px solid ${on ? "var(--text)" : "var(--rule)"}`,
                background: on ? "var(--text)" : "transparent",
                color: on ? "var(--bg-elevated)" : MUTED,
                fontWeight: on ? 500 : 400,
              }}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductionDesk({ operator = "" }: { operator?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const [only, setOnly] = useState("");

  // Seeded batches regenerate; imported ones are read back after mount so
  // server and client render the same thing first.
  const [batches, setBatches] = useState<Batch[]>(SEED_BATCHES);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setBatches(loadBatches());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveBatches(batches);
  }, [batches, loaded]);

  const all = useMemo(() => batchStates(batches), [batches]);
  const states = useMemo(() => {
    let out = all;
    if (line) out = out.filter((s) => s.batch.line === line);
    if (only === "attention") out = out.filter((s) => s.status !== "ok");
    return out;
  }, [all, line, only]);

  const counts = useMemo(() => {
    const scope = line ? all.filter((s) => s.batch.line === line) : all;
    return {
      batches: scope.length,
      held: scope.filter((s) => s.status === "overdue" && !s.batch.stopped).length,
      units: scope.filter((s) => !s.batch.stopped).reduce((a, s) => a + s.batch.unitsMade, 0),
    };
  }, [all, line]);

  return (
    <>
      <h1 style={{ ...serif, fontSize: 30, lineHeight: 1.08, color: "var(--text)", marginBottom: 10 }}>
        Production
      </h1>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 660, marginBottom: 26 }}>
        Every batch made, and the evidence that made it safe. The heat treatment, the detector challenges and the fill
        weights are not three logs that mention the same code — they are one record, and a batch is releasable only when
        all three hold.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22, alignItems: "center" }}>
        <Tally n={counts.batches} label="batches this week" />
        <Tally n={counts.held} label="not releasable" color={counts.held ? VERM : GREEN} />
        <Tally n={counts.units} label="units packed" />
      </div>

      <ChartImport
        operator={operator}
        onSaved={(b) => {
          setBatches((prev) => [b, ...prev.filter((x) => x.id !== b.id)]);
          setOpen(b.id);
        }}
      />

      <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
        <Pills
          label="Line"
          value={line}
          options={[["", "Both lines"], ["ice cream", "Ice cream"], ["chocolate", "Chocolate"]]}
          onChange={setLine}
        />
        <Pills
          label="Show"
          value={only}
          options={[["", "Everything"], ["attention", "Needs attention"]]}
          onChange={setOnly}
        />
      </div>

      {states.length === 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, color: MUTED }}>
            No batches match this filter. The record itself is not empty.
          </p>
        </div>
      )}

      {states.map((st) => (
        <BatchRow
          key={st.batch.id}
          state={st}
          open={open === st.batch.id}
          onToggle={() => setOpen(open === st.batch.id ? null : st.batch.id)}
          operator={operator}
        />
      ))}
    </>
  );
}

// ————————————————————————— chart import —————————————————————————
//
// Drop the recorder's export and the desk reads the trace: peak, hold,
// and whether product ever went forward under temperature. Nobody types
// a number off a printout, which is the whole point — a mistyped peak is
// invisible afterwards, and a derived one is checkable against the file
// it came from.

function ChartImport({
  operator,
  onSaved,
}: {
  operator: string;
  onSaved: (b: Batch) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState<ChartRead | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setRead(null);
    try {
      setRead(await readChart(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  if (read) {
    const p = toPasteurisation(read, operator);
    const v = judgePasteurisation(p, "ice cream");
    const a = read.analysis;
    return (
      <div style={{ ...card, marginBottom: 22, borderLeft: `2px solid ${STATUS_COLOR[v.status]}` }}>
        <p style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
          READ FROM {read.fileName.toUpperCase()}
        </p>
        <p style={{ fontSize: 14.5, marginBottom: 4 }}>{read.product ?? "Product not stated on the chart"}</p>
        <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginBottom: 14 }}>
          {read.batchCode ?? "no batch code on the chart"}
          {read.instrument ? ` \u00b7 ${read.instrument}` : ""}
          {read.date ? ` \u00b7 ${read.date}` : ""}
          {` \u00b7 ${read.samples.length} readings`}
        </p>

        <Line status={v.status} text={v.reason} />

        <Detail k="Peak temperature" v={`${a.peakC}\u00b0C`} />
        <Detail k="Longest hold above the limit" v={`${a.holdSeconds}s (${a.holdFrom} to ${a.holdTo})`} />
        <Detail k="Sample interval" v={`${a.intervalSeconds}s`} />
        <Detail k="Trace runs" v={`${a.firstAt} to ${a.lastAt}`} />
        <Detail
          k="Divert valve"
          v={a.divertKnown ? (a.divertSeen ? "Seen operating on this run" : "Column present, never opened") : "Not in this export"}
        />
        <Detail
          k="Forward flow below the limit"
          v={a.divertKnown ? `${a.belowLimitForwardSeconds}s` : "Cannot be judged without a divert column"}
        />

        {read.notes.map((nt, i) => (
          <p key={i} style={{ fontSize: 12.5, color: BRASS, marginTop: 10, lineHeight: 1.5 }}>
            {nt}
          </p>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const id = read.batchCode ?? `IMP-${Date.now()}`;
              onSaved({
                id,
                product: read.product ?? id,
                line: "ice cream",
                volume: 0,
                volumeUnit: "L",
                unitsMade: 0,
                packSize: "\u2014",
                startedAt: a.firstAt,
                daysAgo: 0,
                by: operator || "\u2014",
                madeOn: read.date,
                pasteurisation: toPasteurisation(read, operator),
                metal: [],
                fill: [],
                imported: true,
              });
              setRead(null);
            }}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "7px 14px" }}
          >
            Record against {read.batchCode ?? "a new batch"}
          </button>
          <button
            onClick={() => setRead(null)}
            style={{ font: "inherit", fontSize: 13, padding: "7px 14px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
          >
            Discard
          </button>
        </div>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
          Recording this creates the batch with its heat treatment evidenced. Detector challenges and fill weights are
          still to come, so it will read as not yet releasable until they are.
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files?.[0]); }}
      style={{
        ...card,
        marginBottom: 22,
        borderStyle: "dashed",
        borderColor: over ? "var(--text)" : "var(--rule)",
        textAlign: "center",
        padding: "22px 18px",
      }}
    >
      <p style={{ fontSize: 14, marginBottom: 4 }}>
        {busy ? "Reading the trace\u2026" : "Drop a chart recorder export"}
      </p>
      <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 12, lineHeight: 1.55, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
        The desk reads the trace and works out the peak, the hold, and whether product ever went forward below the
        limit. Nothing is typed off a printout. CSV or Excel — a chart exported as PDF is a picture of a graph
        rather than a table of readings.
      </p>
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="btn btn-primary"
        style={{ fontSize: 13, padding: "7px 14px" }}
      >
        Choose a file
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,.xlsx,.xls,.xlsm"
        onChange={(e) => void take(e.target.files?.[0] ?? undefined)}
        style={{ display: "none" }}
      />
      {error && (
        <p style={{ fontSize: 13, color: VERM, marginTop: 12, lineHeight: 1.5, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function BatchRow({
  state,
  open,
  onToggle,
  operator,
}: {
  state: BatchState;
  open: boolean;
  onToggle: () => void;
  operator: string;
}) {
  const b = state.batch;
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          background: "none",
          border: "none",
          borderLeft: `3px solid ${STATUS_COLOR[state.status]}`,
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span aria-hidden style={{ ...mono, fontSize: 12, color: MUTED, width: 12 }}>
          {open ? "\u2212" : "+"}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5 }}>{b.product}</span>
          <span style={{ ...mono, display: "block", fontSize: 11.5, color: MUTED, marginTop: 3 }}>
            {b.id} · {batchDayLabel(b)} · {b.by}
          </span>
        </span>
        <span style={{ ...mono, fontSize: 12, color: MUTED, ...col(90) }}>
          {b.stopped ? "\u2014" : `${b.unitsMade.toLocaleString("en-GB")} units`}
        </span>
        <span style={{ fontSize: 12.5, color: STATUS_COLOR[state.status], ...col(170) }}>
          {b.stopped ? "Stopped and diverted" : state.status === "ok" ? "Releasable" : state.status === "due" ? "Releasable, with a note" : "Not releasable"}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--rule)", padding: "16px 20px 18px 42px" }}>
          <div
            style={{
              ...card,
              borderLeft: `2px solid ${STATUS_COLOR[state.status]}`,
              marginBottom: 20,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <p style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1, minWidth: 260 }}>{state.release}</p>
            <ExportButton
              label="Export batch record"
              build={async () => download(await batchRecordBlob(b, operator), batchRecordFilename(b))}
            />
          </div>

          <Block title="Batch">
            <Detail k="Batch code" v={b.id} />
            <Detail k="Product" v={b.product} />
            <Detail k="Line" v={b.line === "ice cream" ? "Ice cream" : "Chocolate"} />
            <Detail k="Made" v={`${batchDate(b)}, started ${b.startedAt}`} />
            <Detail k="Volume" v={`${b.volume.toLocaleString("en-GB")} ${b.volumeUnit}`} />
            <Detail k="Packed" v={b.stopped ? "Nothing packed" : `${b.unitsMade.toLocaleString("en-GB")} \u00d7 ${b.packSize}`} />
            <Detail k="Run by" v={b.by} />
          </Block>

          <Block title="Pasteurisation">
            <Line status={state.pasteurisation.status} text={state.pasteurisation.reason} />
            {b.pasteurisation ? (
              <>
                <Detail k="Peak temperature" v={`${b.pasteurisation.peakC}\u00b0C`} />
                <Detail k="Hold" v={`${b.pasteurisation.holdSeconds}s`} />
                <Detail
                  k="Critical limit"
                  v={`${PASTEURISATION.criticalC}\u00b0C for ${PASTEURISATION.holdSeconds}s`}
                />
                <Detail k="Process set to" v={`${PASTEURISATION.targetC}\u00b0C`} />
                <Detail k="Chart" v={b.pasteurisation.chartRef} />
                <Detail
                  k="Divert valve tested"
                  v={b.pasteurisation.divertTested ? `Yes \u00b7 ${b.pasteurisation.divertTestedBy}` : "No"}
                />
                <Detail k="Recorded" v={`${b.pasteurisation.at} \u00b7 ${b.pasteurisation.by}`} />
              </>
            ) : b.line === "chocolate" ? null : (
              <p style={{ fontSize: 13, color: VERM }}>Nothing recorded.</p>
            )}
          </Block>

          <Block title={`Metal detection (${b.metal.length})`}>
            <Line status={state.metal.status} text={state.metal.reason} />
            {b.metal.length > 0 && (
              <>
                <div style={{ ...row, paddingBottom: 6 }}>
                  <span style={{ ...mono, flex: 1, minWidth: 0, fontSize: 10, letterSpacing: "0.12em", color: MUTED }}>WHEN</span>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(60) }}>AT</span>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(120) }}>BY</span>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(150) }}>
                    FE / NON-FE / SS
                  </span>
                </div>
                {b.metal.map((m, i) => {
                  const pass = m.fe && m.nonFe && m.stainless;
                  return (
                    <Fragment key={`${m.when}-${i}`}>
                      <div style={row}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{m.when}</span>
                        <span style={{ ...mono, fontSize: 12, color: MUTED, ...col(60) }}>{m.at}</span>
                        <span style={{ fontSize: 12, color: MUTED, ...col(120) }}>{m.by}</span>
                        <span style={{ ...mono, fontSize: 12, color: pass ? GREEN : VERM, ...col(150) }}>
                          {`${m.fe ? "pass" : "MISS"} / ${m.nonFe ? "pass" : "MISS"} / ${m.stainless ? "pass" : "MISS"}`}
                        </span>
                      </div>
                      {m.note && (
                        <p style={{ fontSize: 12.5, color: BRASS, padding: "2px 0 10px 0", lineHeight: 1.5 }}>
                          {m.note}
                        </p>
                      )}
                    </Fragment>
                  );
                })}
                <p style={{ fontSize: 11.5, color: MUTED, marginTop: 8 }}>
                  Challenge pieces: Fe {METAL_LIMITS.fe}mm, non-Fe {METAL_LIMITS.nonFe}mm, stainless{" "}
                  {METAL_LIMITS.stainless}mm.
                </p>
              </>
            )}
          </Block>

          <Block title={`Fill weights (${b.fill.length})`}>
            <Line status={state.fill.status} text={state.fill.reason} />
            {b.fill.map((f, i) => {
              const r = judgeFill(f);
              const t1 = tne(f.nominal);
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Detail k="Declared" v={`${f.nominal}${f.unit}`} />
                  <Detail k="Tolerance" v={`${t1.toFixed(1)}${f.unit} below declared`} />
                  <Detail k="Sample" v={`${f.samples.length} packs, ${f.at}, ${f.by}`} />
                  <Detail k="Mean" v={`${r.mean.toFixed(1)}${f.unit}`} />
                  <Detail k="Range" v={`${r.min}${f.unit} to ${r.max}${f.unit}`} />
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 10 }}>
                    {f.samples.map((v, j) => {
                      const under = v < f.nominal - t1;
                      const wayUnder = v < f.nominal - t1 * 2;
                      return (
                        <span
                          key={j}
                          style={{
                            ...mono,
                            fontSize: 11.5,
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid ${wayUnder ? VERM : under ? BRASS : "var(--rule)"}`,
                            color: wayUnder ? VERM : under ? BRASS : MUTED,
                          }}
                        >
                          {v}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Block>
        </div>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div style={row}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: MUTED }}>{k}</span>
      <span style={{ ...mono, fontSize: 13, ...col(280) }}>{v}</span>
    </div>
  );
}
