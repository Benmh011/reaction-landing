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
  MIN_SAMPLE,
  batchStates,
  batchDate,
  batchDayLabel,
  judgeFill,
  tne,
  METAL_LIMITS,
  PASTEURISATION,
  type Batch,
  type BatchState,
  type MetalCheck,
  type FillCheck,
  type Pasteurisation,
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

// Holds its width where there is room, gives it up where there is not.
// Refusing to shrink kept desktop alignment honest and pushed the whole
// page sideways on a phone.
function col(width: number): React.CSSProperties {
  return { width, flexShrink: 1, minWidth: 0, textAlign: "right" };
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
  const [starting, setStarting] = useState(false);
  const [justSaved, setJustSaved] = useState<{ id: string; existed: boolean } | null>(null);

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

  function update(id: string, fn: (b: Batch) => Batch) {
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...fn(b), imported: true } : b)),
    );
  }
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
      <header style={{ marginBottom: 24 }}>
        <h2
          style={{
            ...serif,
            fontWeight: 500,
            fontSize: 30,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            color: "var(--text)",
            marginBottom: 8,
          }}
        >
          Production
        </h2>
        <p style={{ fontSize: 14.5, color: MUTED, maxWidth: 580, lineHeight: 1.55 }}>
          Every batch made, and the evidence that made it safe. The heat treatment, the detector challenges and the
          fill weights are not three logs that mention the same code — they are one record, and a batch is releasable
          only when all three hold.
        </p>
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22, alignItems: "center" }}>
        <Tally n={counts.batches} label="batches this week" />
        <Tally n={counts.held} label="not releasable" color={counts.held ? VERM : GREEN} />
        <Tally n={counts.units} label="units packed" />
      </div>

      {starting ? (
        <NewBatchForm
          operator={operator}
          onCancel={() => setStarting(false)}
          onSave={(b) => {
            // Starting a batch on a code that already exists is almost
            // always a typo. Keep whatever was recorded against it
            // rather than quietly replacing the lot.
            const found = batches.find((x) => x.id === b.id);
            const next: Batch = found
              ? { ...found, ...b, pasteurisation: found.pasteurisation, metal: found.metal, fill: found.fill }
              : b;
            setBatches((prev) => [next, ...prev.filter((x) => x.id !== b.id)]);
            setStarting(false);
            setOpen(b.id);
            setJustSaved({ id: b.id, existed: !!found });
          }}
        />
      ) : (
        <ChartImport
          operator={operator}
          existing={batches}
          onByHand={() => setStarting(true)}
          onSaved={(read) => {
            const id = read.batchCode ?? `IMP-${Date.now()}`;
            const found = batches.find((x) => x.id === id);
            const pas = toPasteurisation(read, operator);
            const next: Batch = found
              ? { ...found, pasteurisation: pas, madeOn: found.madeOn ?? read.date, imported: true }
              : {
                  id,
                  product: read.product ?? id,
                  line: "ice cream",
                  volume: 0,
                  volumeUnit: "L",
                  unitsMade: 0,
                  packSize: "\u2014",
                  startedAt: read.analysis.firstAt,
                  daysAgo: 0,
                  by: operator || "\u2014",
                  madeOn: read.date,
                  pasteurisation: pas,
                  metal: [],
                  fill: [],
                  imported: true,
                };
            setBatches((prev) => [next, ...prev.filter((x) => x.id !== id)]);
            setOpen(id);
            setJustSaved({ id, existed: !!found });
          }}
        />
      )}

      {/* Saving a chart creates a batch further down the page, which is
          not obvious from up here. Say where it went and what it still
          needs. */}
      {justSaved && (() => {
        const st = all.find((x) => x.batch.id === justSaved.id);
        if (!st) return null;
        const missing = [
          st.batch.metal.length === 0 ? "a detector challenge" : null,
          st.batch.fill.length === 0 ? "a fill weight check" : null,
          st.batch.line !== "chocolate" && !st.batch.pasteurisation ? "the heat treatment" : null,
        ].filter(Boolean) as string[];
        return (
          <div style={{ ...card, marginBottom: 22, borderLeft: `2px solid ${STATUS_COLOR[st.status]}` }}>
            <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              Batch <strong style={{ fontWeight: 500 }}>{st.batch.id}</strong>{" "}
              {justSaved.existed
                ? "already existed — its heat treatment record has been replaced with this chart, and everything else recorded against it was kept. Opened below."
                : "saved and opened below."}
              {missing.length
                ? ` It still needs ${missing.join(" and ")} — record those inside the batch.`
                : " Every control is evidenced."}
            </p>
            <button
              onClick={() => setJustSaved(null)}
              style={{ font: "inherit", fontSize: 12.5, padding: "5px 12px", marginTop: 10, border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
            >
              Dismiss
            </button>
          </div>
        );
      })()}

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
          onUpdate={(fn) => update(st.batch.id, fn)}
        />
      ))}
    </>
  );
}

// ————————————————————————— recording by hand —————————————————————————
//
// The chart covers the heat treatment. Everything else is somebody with
// a clipboard, so it gets a form — and the same discipline as the rest of
// the system: the name is the signed-in account, and no verdict is
// stored, only the readings it is calculated from.

const inputStyle: React.CSSProperties = {
  font: "inherit",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid var(--rule-strong)",
  background: "var(--bg-surface)",
  color: "inherit",
  width: "100%",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  width = 160,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  width?: number | string;
}) {
  return (
    <label style={{ display: "block", width }}>
      <span style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 4 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      {hint && <span style={{ display: "block", fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

function Choice<T extends string>({
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
      <span style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 4 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map(([v, l]) => {
          const on = v === value;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 99,
                cursor: "pointer",
                border: `1px solid ${on ? "var(--text)" : "var(--rule-strong)"}`,
                background: on ? "var(--text)" : "transparent",
                color: on ? "var(--bg-elevated)" : MUTED,
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

function FormPanel({
  title,
  children,
  onSave,
  onCancel,
  saveLabel = "Record",
  disabled,
  note,
}: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div style={{ ...card, marginTop: 10, marginBottom: 6 }}>
      <p style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: MUTED, marginBottom: 12 }}>
        {title.toUpperCase()}
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>{children}</div>
      {note && <p style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>{note}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onSave} disabled={disabled} className="btn btn-primary" style={{ fontSize: 13, padding: "7px 14px" }}>
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          style={{ font: "inherit", fontSize: 13, padding: "7px 14px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function nowClock(): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function NewBatchForm({ operator, onSave, onCancel }: { operator: string; onSave: (b: Batch) => void; onCancel: () => void }) {
  const [id, setId] = useState("");
  const [product, setProduct] = useState("");
  const [line, setLine] = useState<"ice cream" | "chocolate">("ice cream");
  const [volume, setVolume] = useState("");
  const [units, setUnits] = useState("");
  const [pack, setPack] = useState("");
  const [at, setAt] = useState(nowClock());

  const ok = id.trim() !== "" && product.trim() !== "";

  return (
    <FormPanel
      title="Start a batch"
      onCancel={onCancel}
      saveLabel="Start batch"
      disabled={!ok}
      note="The batch exists from here. Its heat treatment, detector challenges and fill weights are recorded against it as the run goes on, and it is not releasable until they are."
      onSave={() =>
        onSave({
          id: id.trim(),
          product: product.trim(),
          line,
          volume: Number(volume) || 0,
          volumeUnit: line === "chocolate" ? "kg" : "L",
          unitsMade: Number(units) || 0,
          packSize: pack.trim() || "\u2014",
          startedAt: at.trim() || nowClock(),
          daysAgo: 0,
          by: operator || "\u2014",
          metal: [],
          fill: [],
          imported: true,
        })
      }
    >
      <Field label="Batch code" value={id} onChange={setId} placeholder="IC-2609-35" />
      <Field label="Product" value={product} onChange={setProduct} placeholder="Vanilla — 2L catering" width={260} />
      <Choice label="Line" value={line} options={[["ice cream", "Ice cream"], ["chocolate", "Chocolate"]]} onChange={setLine} />
      <Field label={line === "chocolate" ? "Volume (kg)" : "Volume (L)"} value={volume} onChange={setVolume} placeholder="780" width={120} />
      <Field label="Units made" value={units} onChange={setUnits} placeholder="384" width={120} />
      <Field label="Pack size" value={pack} onChange={setPack} placeholder="2L" width={110} />
      <Field label="Started" value={at} onChange={setAt} width={110} />
    </FormPanel>
  );
}

function MetalForm({ operator, onSave, onCancel }: { operator: string; onSave: (m: MetalCheck) => void; onCancel: () => void }) {
  const [when, setWhen] = useState<MetalCheck["when"]>("start of run");
  const [at, setAt] = useState(nowClock());
  const [fe, setFe] = useState(true);
  const [nonFe, setNonFe] = useState(true);
  const [ss, setSs] = useState(true);
  const [note, setNote] = useState("");
  const failing = !fe || !nonFe || !ss;

  return (
    <FormPanel
      title="Record a detector test"
      onCancel={onCancel}
      saveLabel="Record test"
      note={
        failing
          ? "A missed piece stops the run. Everything packed since the last passing challenge is suspect, and the note is where that decision gets recorded."
          : `Challenge pieces: Fe ${METAL_LIMITS.fe}mm, non-Fe ${METAL_LIMITS.nonFe}mm, stainless ${METAL_LIMITS.stainless}mm. A pass means the detector found and rejected the piece.`
      }
      onSave={() => onSave({ when, at: at.trim() || nowClock(), by: operator || "\u2014", fe, nonFe, stainless: ss, note: note.trim() || undefined })}
    >
      <Choice
        label="When"
        value={when}
        options={[["start of run", "Start"], ["mid run", "Mid"], ["end of run", "End"]]}
        onChange={setWhen}
      />
      <Field label="Time" value={at} onChange={setAt} width={110} />
      <Choice label={`Fe ${METAL_LIMITS.fe}mm`} value={fe ? "y" : "n"} options={[["y", "Rejected"], ["n", "Missed"]]} onChange={(v) => setFe(v === "y")} />
      <Choice label={`Non-Fe ${METAL_LIMITS.nonFe}mm`} value={nonFe ? "y" : "n"} options={[["y", "Rejected"], ["n", "Missed"]]} onChange={(v) => setNonFe(v === "y")} />
      <Choice label={`Stainless ${METAL_LIMITS.stainless}mm`} value={ss ? "y" : "n"} options={[["y", "Rejected"], ["n", "Missed"]]} onChange={(v) => setSs(v === "y")} />
      <Field
        label="Note"
        value={note}
        onChange={setNote}
        width={340}
        placeholder={failing ? "What was done about it" : "Optional"}
      />
    </FormPanel>
  );
}

function FillForm({ operator, onSave, onCancel }: { operator: string; onSave: (f: FillCheck) => void; onCancel: () => void }) {
  const [nominal, setNominal] = useState("");
  const [unit, setUnit] = useState<"ml" | "g">("ml");
  const [at, setAt] = useState(nowClock());
  const [raw, setRaw] = useState("");

  const samples = raw
    .split(/[\s,]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0);
  const nom = Number(nominal);
  const ok = Number.isFinite(nom) && nom > 0 && samples.length >= 2;
  const preview = ok ? judgeFill({ at, by: operator, nominal: nom, unit, samples }) : null;

  return (
    <FormPanel
      title="Record a weight check"
      onCancel={onCancel}
      saveLabel="Record check"
      disabled={!ok}
      note={
        preview
          ? `${samples.length} packs, mean ${preview.mean.toFixed(1)}${unit}, tolerance ${tne(nom).toFixed(1)}${unit} below declared. ${preview.verdict.reason}`
          : `Enter the declared quantity and the weights. Below ${MIN_SAMPLE} packs the average cannot be judged, only whether any single pack is under the absolute limit. The verdict is calculated, not chosen.`
      }
      onSave={() => onSave({ at: at.trim() || nowClock(), by: operator || "\u2014", nominal: nom, unit, samples })}
    >
      <Field label="Declared quantity" value={nominal} onChange={setNominal} placeholder="500" width={140} />
      <Choice label="Unit" value={unit} options={[["ml", "ml"], ["g", "g"]]} onChange={setUnit} />
      <Field label="Time" value={at} onChange={setAt} width={110} />
      <Field
        label="Weights"
        value={raw}
        onChange={setRaw}
        width={380}
        placeholder="504 498 507 501 495 503"
        hint={`Spaces or commas. ${MIN_SAMPLE} is the minimum for judging the average, ten is the usual.`}
      />
    </FormPanel>
  );
}

function PasteurisationForm({ operator, onSave, onCancel }: { operator: string; onSave: (p: Pasteurisation) => void; onCancel: () => void }) {
  const [peak, setPeak] = useState("");
  const [hold, setHold] = useState("");
  const [ref, setRef] = useState("");
  const [at, setAt] = useState(nowClock());
  const [divert, setDivert] = useState(true);

  const ok = Number.isFinite(Number(peak)) && peak !== "" && Number.isFinite(Number(hold)) && hold !== "";
  const preview = ok
    ? judgePasteurisation(
        { peakC: Number(peak), holdSeconds: Number(hold), chartRef: ref, divertTested: divert, at, by: operator, via: "manual" },
        "ice cream",
      )
    : null;

  return (
    <FormPanel
      title="Record the heat treatment by hand"
      onCancel={onCancel}
      saveLabel="Record"
      disabled={!ok}
      note={
        preview
          ? preview.reason
          : `Importing the chart is better than this: it derives the peak and the hold from the trace rather than trusting a number typed off a printout, and it can see product going forward under ${PASTEURISATION.criticalC}\u00b0C, which these fields cannot.`
      }
      onSave={() =>
        onSave({
          peakC: Number(peak),
          holdSeconds: Number(hold),
          chartRef: ref.trim() || "recorded by hand",
          divertTested: divert,
          divertTestedBy: divert ? operator : undefined,
          at: at.trim() || nowClock(),
          by: operator || "\u2014",
          via: "manual",
        })
      }
    >
      <Field label="Peak temperature (°C)" value={peak} onChange={setPeak} placeholder="85.4" width={170} />
      <Field label="Hold (seconds)" value={hold} onChange={setHold} placeholder="16" width={140} />
      <Field label="Chart reference" value={ref} onChange={setRef} placeholder="CH-2609-35" width={170} />
      <Field label="Time" value={at} onChange={setAt} width={110} />
      <Choice label="Divert valve tested" value={divert ? "y" : "n"} options={[["y", "Yes"], ["n", "No"]]} onChange={(v) => setDivert(v === "y")} />
    </FormPanel>
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
  existing,
  onSaved,
  onByHand,
}: {
  operator: string;
  existing: Batch[];
  onSaved: (read: ChartRead) => void;
  onByHand: () => void;
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
    // Whether this chart belongs to a batch already on the board. Saying
    // so before the button is pressed is the difference between an
    // update and a surprise.
    const already = read.batchCode ? existing.find((x) => x.id === read.batchCode) : undefined;
    const kept = already
      ? [
          already.metal.length ? `${already.metal.length} detector test${already.metal.length === 1 ? "" : "s"}` : null,
          already.fill.length ? `${already.fill.length} weight check${already.fill.length === 1 ? "" : "s"}` : null,
        ].filter(Boolean) as string[]
      : [];
    return (
      <div style={{ ...card, marginBottom: 22, borderLeft: `2px solid ${STATUS_COLOR[v.status]}` }}>
        <p style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
          READ FROM {read.fileName.toUpperCase()}
        </p>
        <p style={{ fontSize: 14.5, marginBottom: 4 }}>{read.product ?? "Product not stated on the chart"}</p>
        <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginBottom: already ? 10 : 14 }}>
          {read.batchCode ?? "no batch code on the chart"}
          {read.instrument ? ` \u00b7 ${read.instrument}` : ""}
          {read.date ? ` \u00b7 ${read.date}` : ""}
          {` \u00b7 ${read.samples.length} readings`}
        </p>

        {already && (
          <div
            style={{
              border: "1px solid var(--rule-strong)",
              borderRadius: 10,
              padding: "11px 14px",
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 13, lineHeight: 1.55 }}>
              <strong style={{ fontWeight: 500 }}>Batch {already.id} is already on the board.</strong>{" "}
              {already.pasteurisation
                ? `It has a heat treatment record from ${already.pasteurisation.chartRef}. Saving replaces that with this chart.`
                : "It has no heat treatment record yet. Saving adds this one."}
              {kept.length ? ` Its ${kept.join(" and ")} stay as they are.` : ""}
            </p>
          </div>
        )}

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

        <p style={{ fontSize: 12.5, color: MUTED, marginTop: 16, marginBottom: 10, lineHeight: 1.5 }}>
          {already
            ? "Only the heat treatment record changes. Nothing else recorded against this batch is touched."
            : read.batchCode
              ? `Saving this creates batch ${read.batchCode} with its heat treatment evidenced by this chart. Detector tests and weight checks are recorded separately, so it reads as not yet releasable until they are.`
              : "The chart carries no batch code, so this will be saved under a new one. Detector tests and weight checks are recorded separately."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              onSaved(read);
              setRead(null);
            }}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "7px 14px" }}
          >
            {already
              ? `Update batch ${already.id}`
              : read.batchCode
                ? `Save as batch ${read.batchCode}`
                : "Save as a new batch"}
          </button>
          <button
            onClick={() => setRead(null)}
            style={{ font: "inherit", fontSize: 13, padding: "7px 14px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
          >
            Discard
          </button>
        </div>
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
      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => input.current?.click()}
          disabled={busy}
          className="btn btn-primary"
          style={{ fontSize: 13, padding: "7px 14px" }}
        >
          Choose a file
        </button>
        <span style={{ fontSize: 12.5, color: MUTED }}>or</span>
        <button
          onClick={onByHand}
          style={{ font: "inherit", fontSize: 13, padding: "7px 14px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
        >
          Start a batch by hand
        </button>
      </div>
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
  onUpdate,
}: {
  state: BatchState;
  open: boolean;
  onToggle: () => void;
  operator: string;
  onUpdate: (fn: (b: Batch) => Batch) => void;
}) {
  const b = state.batch;
  const [adding, setAdding] = useState<"metal" | "fill" | "pasteurisation" | null>(null);
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
            {b.line !== "chocolate" && !b.stopped && adding !== "pasteurisation" && (
              <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setAdding("pasteurisation")}
              style={{ font: "inherit", fontSize: 12.5, padding: "6px 12px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
            >
              {b.pasteurisation ? "Replace the heat treatment record" : "Record the heat treatment by hand"}
            </button>
              </div>
            )}
            {adding === "pasteurisation" && (
              <PasteurisationForm
                operator={operator}
                onCancel={() => setAdding(null)}
                onSave={(pz) => {
                  onUpdate((x) => ({ ...x, pasteurisation: pz }));
                  setAdding(null);
                }}
              />
            )}
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
            {!b.stopped && adding !== "metal" && (
              <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setAdding("metal")}
              style={{ font: "inherit", fontSize: 12.5, padding: "6px 12px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
            >
              Record a test
            </button>
              </div>
            )}
            {adding === "metal" && (
              <MetalForm
                operator={operator}
                onCancel={() => setAdding(null)}
                onSave={(m) => {
                  onUpdate((x) => ({ ...x, metal: [...x.metal, m] }));
                  setAdding(null);
                }}
              />
            )}
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
            {!b.stopped && adding !== "fill" && (
              <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setAdding("fill")}
              style={{ font: "inherit", fontSize: 12.5, padding: "6px 12px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
            >
              Record a weight check
            </button>
              </div>
            )}
            {adding === "fill" && (
              <FillForm
                operator={operator}
                onCancel={() => setAdding(null)}
                onSave={(f) => {
                  onUpdate((x) => ({ ...x, fill: [...x.fill, f] }));
                  setAdding(null);
                }}
              />
            )}
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
