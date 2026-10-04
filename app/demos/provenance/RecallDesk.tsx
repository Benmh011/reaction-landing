"use client";

// ————————————————————————————————————————————————————————————————
// The recall desk. Replaces the static traceability page.
//
// Pick a lot, start the clock, and the desk traces it both ways from the
// live movement log: what went in, what it became, where it is, who has
// it. Count what is physically at each location, place anything you need
// to on hold — a real movement, on the real log — reconcile, record what
// you found, and export the trace pack.
//
// Nothing is simulated. It is the same tool that would run on the day.
// ————————————————————————————————————————————————————————————————

import { useEffect, useMemo, useState } from "react";
import { fmtQty, locationLabel, materialByCode, type Material, type Movement } from "./stock";
import {
  trace,
  pickableLots,
  startExercise,
  completeExercise,
  countsOutstanding,
  countKey,
  holdMovements,
  loadExercises,
  saveExercises,
  durationLabel,
  metTarget,
  fmtExerciseDate,
  TARGET_MINS,
  TARGET_SCHEME_NOTE,
  type Exercise,
  type LotRef,
  type Trace,
  type Counts,
} from "./recall";
import { tracePackBlob, tracePackFilename } from "./recall-pdf";

const GREEN = "#167a5b";
const BRASS = "#b26a00";
const VERM = "#c0392b";
const MUTED = "#5a6e85";
const NAVY = "#15385c";
const GOLD = "#3370b8";

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)", fontWeight: 500, letterSpacing: "-0.01em" };
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const card: React.CSSProperties = { background: "var(--bg-elevated)", border: "1px solid var(--rule)", borderRadius: 12, padding: "14px 18px" };
const input: React.CSSProperties = { font: "inherit", fontSize: 14, padding: "8px 12px", border: "1px solid var(--rule-strong)", borderRadius: 9, background: "var(--bg)", color: "inherit" };

function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ ...serif, fontSize: 30, lineHeight: 1.08, color: "var(--text)", marginBottom: sub ? 8 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 14.5, color: MUTED, maxWidth: 580, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

function Head({ text }: { text: string }) {
  return <h2 style={{ ...serif, fontSize: 19, color: "var(--text)", margin: "26px 0 10px" }}>{text}</h2>;
}

function RecordIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden>
      <path d="M2 1.5h9.2L16 6.3V18.5H2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.2 1.5v4.8H16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 10h8M5 13h8M5 16h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function openPack(ex: Exercise) {
  const tab = window.open("", "_blank");
  if (!tab) return;
  tab.document.title = "Preparing trace pack…";
  tracePackBlob(ex)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    })
    .catch(() => tab.close());
}

async function exportPack(ex: Exercise) {
  const blob = await tracePackBlob(ex);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tracePackFilename(ex);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ————————————————————————— the desk —————————————————————————

function LineTag({ material }: { material?: Material }) {
  const line = material?.line;
  if (line !== "ice cream" && line !== "chocolate") return null;
  return (
    <span style={{ display: "block", marginTop: 5 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          display: "inline-block",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          padding: "2px 7px",
          border: "1px solid var(--rule-strong)",
          borderRadius: 999,
          color: MUTED,
          whiteSpace: "nowrap",
        }}
      >
        {line === "chocolate" ? "CHOCOLATE" : "ICE CREAM"}
      </span>
    </span>
  );
}

// How a lot reads in the picker: the product, its line, then the lot —
// "Salted caramel — 500ml retail · ice cream · IC-2609-30". The line is
// searchable too, so typing "chocolate" narrows the list to chocolate.
function lotLabel(l: { materialCode: string; lot: string; material?: Material }): string {
  const m = l.material ?? materialByCode(l.materialCode);
  const line = m?.line === "ice cream" || m?.line === "chocolate" ? ` · ${m.line}` : "";
  return `${m?.name ?? l.materialCode}${line} · ${l.lot}`;
}

export default function RecallDesk({
  movements,
  onMovements,
  operator = "",
  onOpenStock,
}: {
  movements: Movement[];
  onMovements: (next: Movement[]) => void;
  operator?: string;
  // Show a lot on the Stock page: where it is now and every movement it
  // has had.
  onOpenStock?: (ref: LotRef) => void;
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState<Exercise | null>(null);
  const [viewing, setViewing] = useState<Exercise | null>(null);
  const [pick, setPick] = useState("");
  const [query, setQuery] = useState("");
  // Looking a lot up, as opposed to testing the recall procedure. The trail
  // is every lot visited by clicking through, so Back walks the chain in
  // reverse. Nothing here is recorded and no clock runs.
  const [trail, setTrail] = useState<LotRef[]>([]);

  useEffect(() => {
    setExercises(loadExercises(movements));
    setLoaded(true);
    // Seeds are rebuilt from the log; only the person's own exercises persist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (loaded) saveExercises(exercises);
  }, [exercises, loaded]);

  const lots = useMemo(() => pickableLots(movements), [movements]);
  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return lots;
    return lots.filter((l) => lotLabel(l).toLowerCase().includes(q));
  }, [lots, query]);

  function begin(ref?: LotRef) {
    const chosen = ref ?? lots.find((l) => `${l.materialCode}|${l.lot}` === pick);
    if (!chosen) return;
    setTrail([]);
    setLive(startExercise({ materialCode: chosen.materialCode, lot: chosen.lot }, operator || "Operator"));
  }

  function lookUp() {
    const chosen = lots.find((l) => `${l.materialCode}|${l.lot}` === pick);
    if (chosen) setTrail([{ materialCode: chosen.materialCode, lot: chosen.lot }]);
  }

  function finish(ex: Exercise, notes: string) {
    const done = completeExercise(ex, movements, notes);
    setExercises((prev) => [done, ...prev]);
    setLive(null);
    setViewing(done);
  }

  if (live) {
    return (
      <LiveExercise
        ex={live}
        movements={movements}
        onChange={setLive}
        onHold={(ms, h, fromKey) => {
          onMovements([...ms, ...movements]);
          // The count follows the stock. A discrepancy found at Strete Gate
          // is still a discrepancy once the stock is in quarantine.
          const counts: Counts = { ...live.counts };
          const toKey = `${h.lot.materialCode}|${h.lot.lot}|WH-QUAR`;
          if (counts[fromKey] !== undefined) {
            counts[toKey] = (counts[toKey] ?? 0) + counts[fromKey];
            delete counts[fromKey];
          }
          setLive({ ...live, counts, holds: [...live.holds, h] });
        }}
        onComplete={(notes) => finish(live, notes)}
        onAbandon={() => setLive(null)}
        onOpenStock={onOpenStock}
      />
    );
  }

  if (viewing) {
    return <ExerciseRecord ex={viewing} onClose={() => setViewing(null)} onOpenStock={onOpenStock} />;
  }

  if (trail.length) {
    const ref = trail[trail.length - 1];
    const t = trace(movements, ref);
    const m = materialByCode(ref.materialCode);
    const where = t.onHand.filter((b) => b.materialCode === ref.materialCode && b.lot === ref.lot);
    return (
      <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {trail.length > 1 && (
            <button onClick={() => setTrail((tr) => tr.slice(0, -1))} className="btn" style={{ border: "1px solid var(--rule-strong)" }}>
              ← Back to {materialByCode(trail[trail.length - 2].materialCode)?.name ?? trail[trail.length - 2].materialCode}
            </button>
          )}
          <button onClick={() => setTrail([])} className="btn" style={{ border: "1px solid var(--rule-strong)" }}>
            Close
          </button>
        </div>

        <Title
          title={m?.name ?? ref.materialCode}
          sub={`Lot ${ref.lot}. Where this lot came from and where it went. No clock is running and nothing is recorded — this is a look, not an exercise.`}
        />
        <LineTag material={m} />

        {trail.length > 1 && (
          <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
            {trail.map((r) => `${materialByCode(r.materialCode)?.name ?? r.materialCode} (${r.lot})`).join("  \u2192  ")}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 22px" }}>
          <button onClick={() => begin(ref)} className="btn btn-primary">
            Start a mock recall on this lot
          </button>
          {onOpenStock && (
            <button onClick={() => onOpenStock(ref)} className="btn" style={{ border: "1px solid var(--rule-strong)" }}>
              Open in Stock
            </button>
          )}
        </div>

        <Head text="Where it is now" />
        {where.length === 0 ? (
          <p style={{ fontSize: 13.5, color: MUTED }}>None of this lot is left in stock.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {where.map((b) => (
              <div key={b.locationId} style={{ ...card, padding: "10px 15px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14 }}>
                  {b.location ? locationLabel(b.location) : b.locationId}
                  {b.location?.holding && <span style={{ ...mono, fontSize: 11, color: BRASS }}> · on hold</span>}
                </span>
                <span style={{ ...mono, fontSize: 12.5, color: MUTED }}>{fmtQty(b.qty, b.unit)}</span>
              </div>
            ))}
          </div>
        )}

        <TraceView t={t} onTrace={(r) => setTrail((tr) => [...tr, r])} onOpenStock={onOpenStock} />
      </>
    );
  }

  return (
    <>
      <Title
        title="Traceability and recall"
        sub="Start from any lot and the desk traces it both ways from the live movement log — what went in, what it became, where it is now, and who received it. Count what is actually there, place stock on hold, reconcile, and export the trace pack. A mock recall is this, with the clock running."
      />

      <div style={{ ...card, marginBottom: 26 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Start an exercise</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by material or lot code"
            style={{ ...input, width: 240 }}
          />
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...input, minWidth: 0, maxWidth: "100%" }}>
            <option value="">Choose a lot…</option>
            {shown.map((l) => (
              <option key={`${l.materialCode}|${l.lot}`} value={`${l.materialCode}|${l.lot}`}>
                {lotLabel(l)} — {l.kind === "batch" ? "batch" : "raw"}{l.onHand > 0 ? `, ${fmtQty(l.onHand, l.unit)} on hand` : ""}
              </option>
            ))}
          </select>
          <button onClick={lookUp} disabled={!pick} className="btn" style={{ opacity: pick ? 1 : 0.5, border: "1px solid var(--rule-strong)" }}>
            Look up
          </button>
          <button onClick={() => begin()} disabled={!pick} className="btn btn-primary" style={{ opacity: pick ? 1 : 0.5 }}>
            Start mock recall
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>
          Look up shows where a lot came from and where it went, with nothing recorded. The clock only starts on a mock recall. Salcombe Dairy&rsquo;s traceability procedure sets the target at a
          full trace, reconciled to 100%, within {TARGET_MINS / 60} hours. {TARGET_SCHEME_NOTE}
        </p>
      </div>

      <Head text="Exercises on record" />
      {exercises.length === 0 && <p style={{ fontSize: 13.5, color: MUTED }}>No exercises recorded yet.</p>}
      <div style={{ display: "grid", gap: 6 }}>
        {exercises.map((ex) => {
          const met = metTarget(ex);
          const name = ex.snapshot?.originMaterial?.name ?? ex.origin.materialCode;
          return (
            <div key={ex.id} style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, padding: "11px 15px", alignItems: "center" }}>
              <button onClick={() => setViewing(ex)} style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", background: "none", border: "none", padding: 0 }}>
                <p style={{ fontSize: 14 }}>
                  <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: met ? GREEN : VERM, marginRight: 8 }} />
                  {name} · {ex.origin.lot}
                </p>
                <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                  {ex.by} · {fmtExerciseDate(ex)} · {durationLabel(ex)} · {ex.snapshot?.customers.length ?? 0} customers
                </p>
              </button>
              <span style={{ fontSize: 12.5, color: met ? GREEN : VERM, whiteSpace: "nowrap" }}>{met ? "Target met" : "Target not met"}</span>
              <button onClick={() => openPack(ex)} className="rc-record-btn" title="Open the trace pack" aria-label={`Open the trace pack for ${ex.origin.lot}`}>
                <RecordIcon />
              </button>
            </div>
          );
        })}
      </div>
      <Styles />
    </>
  );
}

// ————————————————————————— a live exercise —————————————————————————

function LiveExercise({
  ex,
  movements,
  onChange,
  onHold,
  onComplete,
  onAbandon,
  onOpenStock,
}: {
  ex: Exercise;
  movements: Movement[];
  onChange: (ex: Exercise) => void;
  onHold: (ms: Movement[], h: Exercise["holds"][number], fromKey: string) => void;
  onComplete: (notes: string) => void;
  onAbandon: () => void;
  onOpenStock?: (ref: LotRef) => void;
}) {
  const t = useMemo(() => trace(movements, ex.origin, ex.counts), [movements, ex.origin, ex.counts]);
  const [notes, setNotes] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const outstanding = countsOutstanding(t, ex.counts);
  const setCount = (k: string, v: string) => {
    const n = parseFloat(v);
    const counts: Counts = { ...ex.counts };
    if (v.trim() === "" || !Number.isFinite(n)) delete counts[k];
    else counts[k] = n;
    onChange({ ...ex, counts });
  };

  const gaps = t.reconciliation.filter((r) => r.gap !== 0 && r.uncounted === 0);
  const canComplete = outstanding === 0 && (gaps.length === 0 || notes.trim().length > 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>Mock recall in progress · {ex.id}</p>
          <h1 style={{ ...serif, fontSize: 26, lineHeight: 1.1, color: "var(--text)" }}>
            {t.originMaterial?.name ?? ex.origin.materialCode}
          </h1>
          <p style={{ ...mono, fontSize: 12, color: MUTED, marginTop: 6 }}>
            lot {ex.origin.lot} · {ex.by} · started {fmtExerciseDate(ex)} · <span style={{ color: NAVY, fontWeight: 500 }}>{durationLabel(ex)} elapsed</span>
          </p>
        </div>
        <button onClick={onAbandon} style={{ background: "none", border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "7px 13px", fontSize: 13, cursor: "pointer", color: "inherit", font: "inherit" }}>
          Abandon
        </button>
      </div>

      <TraceView t={t} onOpenStock={onOpenStock} />

      <Head text="Count what is there" />
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 1.5, maxWidth: 620 }}>
        Go to each location holding affected stock and enter what is physically there. The book says what should be; the count says what is. The exercise cannot be completed until every location is counted.
      </p>
      {(() => {
        const toCount = t.onHand.filter((b) => !b.location?.holding).length;
        const done = toCount - outstanding;
        return (
          <div style={{ ...card, marginBottom: 12, padding: "11px 15px", borderLeft: `2px solid ${outstanding ? BRASS : GREEN}` }}>
            <p style={{ fontSize: 13.5 }}>
              <strong style={{ fontWeight: 500 }}>{done} of {toCount}</strong> location{toCount === 1 ? "" : "s"} counted
              {outstanding ? ` — ${outstanding} still to do.` : ". Every location has been counted."}
            </p>
          </div>
        );
      })()}
      <div style={{ display: "grid", gap: 6 }}>
        {t.onHand.map((b) => {
          const k = countKey(b);
          const c = ex.counts[k];
          const diff = c === undefined ? null : c - b.qty;
          const held = ex.holds.some(
            (h) =>
              h.lot.lot === b.lot &&
              (h.location === locationLabel(b.location, b.locationId) ||
                h.location === (b.location?.name ?? b.locationId)),
          );
          return (
            <div key={k} style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 14, alignItems: "center", padding: "11px 15px", borderLeft: diff === null ? undefined : `2px solid ${diff === 0 ? GREEN : VERM}` }}>
              <div>
                <p style={{ fontSize: 14 }}>{locationLabel(b.location, b.locationId)}{b.location?.holding ? " · on hold" : ""}</p>
                <p style={{ ...mono, fontSize: 11, color: MUTED, marginTop: 2 }}>{b.material?.name ?? b.materialCode} · {b.lot}</p>
                <p style={{ ...mono, fontSize: 11.5, marginTop: 3 }}>should be {fmtQty(b.qty, b.unit)}</p>
              </div>
              {b.location?.holding ? (
                <span style={{ ...mono, fontSize: 12.5, color: MUTED }}>
                  {c !== undefined ? `counted ${fmtQty(c, b.unit)}` : "on hold · not counted here"}
                </span>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12.5, color: MUTED }}>
                    Counted
                    {/* No placeholder. Showing the book figure inside the box
                        makes an empty field look like a filled one, which is
                        the worst thing a count sheet can do. */}
                    <input
                      value={c ?? ""}
                      onChange={(e) => setCount(k, e.target.value)}
                      inputMode="decimal"
                      style={{ ...input, ...mono, width: 90, marginLeft: 8, padding: "6px 10px" }}
                    />
                  </label>
                  {c === undefined && (
                    <button
                      onClick={() => setCount(k, String(b.qty))}
                      style={{ font: "inherit", fontSize: 12, padding: "5px 11px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap" }}
                      title={`Record the count as ${fmtQty(b.qty, b.unit)}`}
                    >
                      Same as book
                    </button>
                  )}
                </div>
              )}
              <span style={{ ...mono, fontSize: 12.5, color: diff === null ? MUTED : diff === 0 ? GREEN : VERM, width: 64, flexShrink: 1, minWidth: 0, textAlign: "right" }}>
                {diff === null ? "—" : diff === 0 ? "matches" : diff > 0 ? `+${diff}` : `${diff}`}
              </span>
              {!b.location?.holding && !held ? (
                <button
                  onClick={() => onHold(holdMovements(b, ex.by, ex.id), { lot: { materialCode: b.materialCode, lot: b.lot }, location: locationLabel(b.location, b.locationId), qty: b.qty, unit: b.unit }, k)}
                  style={{ font: "inherit", fontSize: 12.5, padding: "6px 12px", border: `1px solid ${VERM}`, color: VERM, background: "transparent", borderRadius: 999, cursor: "pointer" }}
                >
                  Place on hold
                </button>
              ) : (
                <span style={{ fontSize: 12, color: MUTED, width: 96, flexShrink: 1, minWidth: 0, textAlign: "right" }}>{held ? "held" : ""}</span>
              )}
            </div>
          );
        })}
      </div>

      <Reconciliation t={t} collapsible />

      <Head text="Findings" />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={gaps.length ? "There is a gap. Say what it is and what is being done about it — the exercise cannot be completed without this." : "Anything found during the exercise, or what was confirmed."}
        rows={3}
        style={{ ...input, width: "100%", maxWidth: 680, fontFamily: "inherit", resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => onComplete(notes)} disabled={!canComplete} className="btn btn-primary" style={{ opacity: canComplete ? 1 : 0.5 }}>
          Complete exercise
        </button>
        <span style={{ fontSize: 12.5, color: MUTED }}>
          {outstanding ? `${outstanding} location${outstanding === 1 ? "" : "s"} still to count.` : gaps.length && !notes.trim() ? "Explain the gap in findings first." : "Stops the clock and records the exercise."}
        </span>
      </div>
      <Styles />
    </>
  );
}

// ————————————————————————— shared views —————————————————————————

// A product name that traces its lot when clicked, where there is somewhere
// to go; plain text otherwise. Underlined so it reads as something to click.
function TraceName({ label, lotRef, onTrace }: { label: string; lotRef: LotRef; onTrace?: (r: LotRef) => void }) {
  if (!onTrace) return <>{label}</>;
  return (
    <button
      onClick={() => onTrace(lotRef)}
      style={{
        font: "inherit",
        color: "inherit",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        textDecoration: "underline",
        textDecorationColor: "var(--rule-strong)",
        textUnderlineOffset: 3,
      }}
    >
      {label}
    </button>
  );
}

function StockLink({ lotRef, onOpenStock }: { lotRef: LotRef; onOpenStock?: (r: LotRef) => void }) {
  if (!onOpenStock) return null;
  return (
    <button
      onClick={() => onOpenStock(lotRef)}
      style={{
        font: "inherit",
        fontSize: 11.5,
        padding: "2px 9px",
        border: "1px solid var(--rule-strong)",
        borderRadius: 999,
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Stock
    </button>
  );
}

function TraceView({
  t,
  onTrace,
  onOpenStock,
}: {
  t: Trace;
  onTrace?: (r: LotRef) => void;
  onOpenStock?: (r: LotRef) => void;
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 8 }}>
        <Tally n={t.affected.length} label={t.affected.length === 1 ? "lot affected" : "lots affected"} />
        <Tally n={t.onHand.filter((b) => !b.location?.holding).length} label="locations to count" />
        <Tally n={t.customers.length} label="customers received it" color={t.customers.length ? VERM : GREEN} />
        <Tally n={t.dispatches.reduce((s, d) => s + d.qty, 0)} label="units with customers" color={t.customers.length ? VERM : GREEN} />
      </div>

      <Head text={t.kind === "raw" ? "What it became" : "What went into it"} />
      {t.kind === "raw" ? (
        t.forward.length === 0 ? (
          <p style={{ fontSize: 13.5, color: MUTED }}>Nothing has been made from this lot yet. Only the lot itself is affected.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {t.forward.map((f) => {
              const r = t.reconciliation.find((x) => x.lot.lot === f.lot);
              return (
                <div key={f.lot} style={{ ...card, padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14 }}>
                    <TraceName label={r?.material?.name ?? f.materialCode} lotRef={{ materialCode: f.materialCode, lot: f.lot }} onTrace={onTrace} />
                    <LineTag material={r?.material ?? materialByCode(f.materialCode)} />
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ ...mono, fontSize: 12.5, color: MUTED }}>batch {f.lot} · {r ? fmtQty(r.in, r.unit) : ""} made</span>
                    <StockLink lotRef={{ materialCode: f.materialCode, lot: f.lot }} onOpenStock={onOpenStock} />
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {t.back.map((b) => (
            <div key={`${b.materialCode}-${b.lot}`} style={{ ...card, padding: "10px 15px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>
                <TraceName label={materialByCode(b.materialCode)?.name ?? b.materialCode} lotRef={{ materialCode: b.materialCode, lot: b.lot }} onTrace={onTrace} />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ ...mono, fontSize: 12.5, color: MUTED }}>lot {b.lot}</span>
                <StockLink lotRef={{ materialCode: b.materialCode, lot: b.lot }} onOpenStock={onOpenStock} />
              </span>
            </div>
          ))}
        </div>
      )}

      <Head text={`Customers who received it${t.customers.length ? ` — ${t.customers.length}` : ""}`} />
      {t.dispatches.length === 0 ? (
        <p style={{ fontSize: 13.5, color: GREEN }}>None. No affected stock has left the estate.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {t.dispatches.map((d, i) => (
            <div key={i} style={{ ...card, padding: "10px 15px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", borderLeft: `2px solid ${VERM}` }}>
              <div>
                <p style={{ fontSize: 14 }}>{d.customer}</p>
                <p style={{ ...mono, fontSize: 11, color: MUTED, marginTop: 2 }}>{d.material?.name ?? d.lot.materialCode} · {d.lot.lot}{d.ref ? ` · ${d.ref}` : ""}</p>
              </div>
              <span style={{ ...mono, fontSize: 13.5, fontWeight: 500 }}>{fmtQty(d.qty, d.unit)}</span>
              <span style={{ ...mono, fontSize: 11.5, color: MUTED }}>{d.at}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Eight numeric columns is a mass balance for an auditor's file, not a
// working view for somebody halfway round the shops with a clipboard.
// Folded away by default while the exercise is live; the trace pack
// carries it in full either way.
function Reconciliation({ t, collapsible = false }: { t: Trace; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible);
  const settled = t.reconciliation.every((r) => r.uncounted === 0);
  return (
    <>
      <Head text="Reconciliation" />
      {collapsible && (
        <div style={{ ...card, marginBottom: 12, padding: "11px 15px" }}>
          <p style={{ fontSize: 13.5, marginBottom: open ? 10 : 0 }}>
            {settled
              ? "Every location counted. The full mass balance is below."
              : "The mass balance cannot settle until every location is counted."}
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{ font: "inherit", fontSize: 12.5, padding: "5px 12px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
          >
            {open ? "Hide the full reconciliation" : "Show the full reconciliation"}
          </button>
        </div>
      )}
      {!open ? null : (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 13 }}>
          <thead>
            <tr>
              {["Lot", "In", "Counted", "On hold", "Dispatched", "Sold", "Used", "Waste", "Result"].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? "left" : "right", fontSize: 11.5, color: MUTED, fontWeight: 500, padding: "0 10px 8px 0", borderBottom: "1px solid var(--rule)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.reconciliation.map((r) => {
              // A percentage that falls back to book quantity where nothing
              // has been counted is a projection, not a result. Showing a
              // green 100% beside an amber "uncounted" was the system
              // contradicting itself on the same line.
              const ok = r.pct >= 100 && r.uncounted === 0;
              const color = ok ? GREEN : r.uncounted ? BRASS : VERM;
              return (
                <tr key={r.lot.lot}>
                  <td style={{ ...mono, padding: "9px 10px 9px 0", borderBottom: "1px solid var(--rule)" }}>{r.lot.lot}</td>
                  {[r.in, r.counted, r.onHold, r.dispatched, r.sold, r.consumed, r.waste].map((v, i) => (
                    <td key={i} style={{ ...mono, textAlign: "right", padding: "9px 10px 9px 0", borderBottom: "1px solid var(--rule)" }}>{Math.round(v * 10) / 10}</td>
                  ))}
                  <td style={{ ...mono, textAlign: "right", padding: "9px 0 9px 0", borderBottom: "1px solid var(--rule)", color, fontWeight: 600 }}>
                    {r.uncounted ? (
                      <>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>not yet reconciled</span>
                        <span style={{ display: "block", fontSize: 11, fontWeight: 400 }}>
                          {r.uncounted} location{r.uncounted === 1 ? "" : "s"} to count
                        </span>
                      </>
                    ) : (
                      <>
                        {r.pct}%
                        {r.gap !== 0 ? (
                          <span style={{ display: "block", fontSize: 11, fontWeight: 400 }}>
                            {Math.abs(r.gap)} {r.unit} {r.gap > 0 ? "short" : "over"}
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

function ExerciseRecord({ ex, onClose, onOpenStock }: { ex: Exercise; onClose: () => void; onOpenStock?: (ref: LotRef) => void }) {
  const t = ex.snapshot;
  const met = metTarget(ex);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>Recall exercise · {ex.id}</p>
          <h1 style={{ ...serif, fontSize: 26, lineHeight: 1.1, color: "var(--text)" }}>{t?.originMaterial?.name ?? ex.origin.materialCode}</h1>
          <p style={{ ...mono, fontSize: 12, color: MUTED, marginTop: 6 }}>
            lot {ex.origin.lot} · {ex.by} · {fmtExerciseDate(ex)} · {durationLabel(ex)} ·{" "}
            <span style={{ color: met ? GREEN : VERM, fontWeight: 500 }}>{met ? "target met" : "target not met"}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportPack(ex)} className="btn btn-primary" style={{ fontSize: 13, padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <RecordIcon />
            Export trace pack
          </button>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "7px 13px", fontSize: 13, cursor: "pointer", color: "inherit", font: "inherit" }}>
            Back
          </button>
        </div>
      </div>
      {t && <TraceView t={t} onOpenStock={onOpenStock} />}
      {t && <Reconciliation t={t} />}
      {ex.holds.length > 0 && (
        <>
          <Head text="Placed on hold" />
          {ex.holds.map((h, i) => (
            <p key={i} style={{ fontSize: 13.5, marginBottom: 4 }}>{fmtQty(h.qty, h.unit)} of {h.lot.lot} from {h.location}</p>
          ))}
        </>
      )}
      <Head text="Findings" />
      <p style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 620, color: ex.notes ? "inherit" : MUTED }}>{ex.notes ?? "No findings recorded."}</p>
      <Styles />
    </>
  );
}

function Tally({ n, label, color = NAVY }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ ...card, padding: "10px 16px" }}>
      <p style={{ ...mono, fontSize: 22, fontWeight: 500, color, lineHeight: 1.1 }}>{n.toLocaleString("en-GB")}</p>
      <p style={{ fontSize: 11.5, color: MUTED }}>{label}</p>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .rc-record-btn {
        display: inline-grid; place-items: center; width: 34px; height: 34px;
        border-radius: 9px; border: 1px solid var(--rule); background: transparent;
        color: ${NAVY}; cursor: pointer; transition: background 140ms ease, border-color 140ms ease;
      }
      .rc-record-btn:hover { background: var(--bg); border-color: var(--rule-strong); }
    `}</style>
  );
}

export { GOLD };
