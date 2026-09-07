"use client";

// ————————————————————————————————————————————————————————————————
// Provenance — the stock desk.
//
// Three views over one movement log: goods in (drop a supplier's note,
// review what was read, book it in), stock on hand (by material or by
// location), and the movement log itself.
//
// The review step is the point of the thing. A delivery note is booked
// in by a person who has seen what the desk read and what it could not
// read — never silently, and never with a guess standing in for a line
// nobody understood.
// ————————————————————————————————————————————————————————————————

import { useMemo, useRef, useState } from "react";
import {
  LOCATIONS,
  MATERIALS,
  SEED_MOVEMENTS,
  balances,
  fmtQty,
  locationById,
  locationsFor,
  groupBalances,
  shelfLife,
  freshnessOf,
  allergenPosition,
  declarationGaps,
  misplaced,
  whereIsLot,
  materialByCode,
  REASON_WORD,
  KIND_LABEL,
  CATEGORY_LABEL,
  REGIME_LABEL,
  REGIME_SPEC,
  ALLERGEN_LABEL,
  FRESHNESS_LABEL,
  SITE_FREE_FROM,
  type Movement,
  type StockLocation,
  type Freshness,
  type Regime,
} from "./stock";
import { parseGoodsIn, resolveLine, type GoodsIn, type GoodsLine, type IssueCode, type ResolveInput } from "./goodsin";

const GREEN = "#167a5b";
const BRASS = "#a3772a";
const VERM = "#c22f4e";
const BLUE = "#2c6e8a";
const MUTED = "#77705f";
const TEAL = "#0e5560";

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const serifItal: React.CSSProperties = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontStyle: "italic",
  fontWeight: 600,
};

const card: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--rule)",
  borderRadius: 12,
  padding: "14px 18px",
};

const STATE_COLOR: Record<GoodsLine["state"], string> = {
  accepted: GREEN,
  held: BRASS,
  exception: VERM,
};
const STATE_WORD: Record<GoodsLine["state"], string> = {
  accepted: "Ready",
  held: "Needs a person",
  exception: "Stop",
};

const SAMPLE_URL = "/samples/westridge-delivery-note.pdf";
const SAMPLE_NAME = "westridge-delivery-note.pdf";

const KIND_WORD: Record<StockLocation["kind"], string> = {
  warehouse: "Warehouse",
  shop: "Shop",
  van: "Vehicle",
};

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.18em", color: MUTED, marginBottom: 8 }}>
        {kicker.toUpperCase()}
      </p>
      <h1 style={{ ...serifItal, fontSize: 34, lineHeight: 1.1, marginBottom: sub ? 10 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 14, color: MUTED, maxWidth: 640, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 99,
        background: color,
        marginRight: 8,
        flexShrink: 0,
      }}
    />
  );
}

// ————————————————————————— the desk —————————————————————————

type Tab = "goodsin" | "onhand" | "shelf" | "allergens" | "holds" | "log";

export default function StockDesk() {
  const [tab, setTab] = useState<Tab>("goodsin");
  const [movements, setMovements] = useState<Movement[]>(SEED_MOVEMENTS);

  return (
    <>
      <SectionTitle
        kicker="Warehouse to van"
        title="Stock"
        sub="Every lot, from the delivery note it arrived on to the shop or vehicle it ends up in. Drop in a supplier's note and the desk reads it, checks it against the material register, and books in what it understood — holding anything it did not, rather than guessing."
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: "1px solid var(--rule)" }}>
        {(
          [
            ["goodsin", "Goods in"],
            ["onhand", "Stock on hand"],
            ["shelf", "Shelf life"],
            ["allergens", "Allergens"],
            ["holds", "Holds"],
            ["log", "Movement log"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === id ? TEAL : "transparent"}`,
              color: tab === id ? "inherit" : MUTED,
              fontWeight: tab === id ? 600 : 400,
              fontSize: 14,
              padding: "8px 14px",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "goodsin" && <GoodsInTab movements={movements} onBook={(ms) => setMovements((p) => [...ms, ...p])} />}
      {tab === "onhand" && <OnHandTab movements={movements} />}
      {tab === "shelf" && <ShelfLifeTab movements={movements} />}
      {tab === "allergens" && <AllergenTab movements={movements} />}
      {tab === "holds" && <HoldsTab movements={movements} />}
      {tab === "log" && <LogTab movements={movements} />}
    </>
  );
}

// ————————————————————————— goods in —————————————————————————

function GoodsInTab({ movements, onBook }: { movements: Movement[]; onBook: (ms: Movement[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GoodsIn | null>(null);
  const [into, setInto] = useState("WH-DRY");
  const [booked, setBooked] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [who, setWho] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handle(file: File) {
    setBusy(true);
    setError(null);
    setBooked(null);
    try {
      const out = await parseGoodsIn(file);
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be read.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadSample() {
    setBusy(true);
    setError(null);
    setBooked(null);
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error("The sample note could not be loaded.");
      const blob = await res.blob();
      const file = new File([blob], SAMPLE_NAME, { type: blob.type });
      const out = await parseGoodsIn(file);
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The sample note could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  // A settled line replaces itself in place and the counts follow. The
  // rules are re-run rather than the status being flipped, so a line only
  // ever becomes bookable because it now genuinely passes.
  function settle(id: string, input: ResolveInput) {
    setResult((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.map((l) => (l.id === id ? resolveLine(l, input) : l));
      return {
        lines,
        report: {
          ...prev.report,
          accepted: lines.filter((l) => l.state === "accepted" && !l.rejected).length,
          held: lines.filter((l) => l.state === "held").length,
          exceptions: lines.filter((l) => l.state === "exception").length,
        },
      };
    });
    setBooked(null);
  }

  function book() {
    if (!result) return;
    const ready = result.lines.filter(
      (l) => l.state === "accepted" && !l.rejected && !l.booked && l.material && l.qty && fits(l.material.regime),
    );
    if (ready.length === 0) return;
    const ms: Movement[] = ready.map((l, i) => ({
      id: `gi-${Date.now()}-${i}`,
      materialCode: l.material!.code,
      lot: l.lot,
      // Quarantined stock is on site but not free to use, so it is booked
      // to the hold rather than wherever the rest of the load went.
      locationId: l.quarantine ? "WH-QUAR" : into,
      qty: l.qty!,
      unit: l.material!.unit,
      reason: "goods-in",
      at: result.report.deliveryDate ?? "Today",
      by: who.trim() || "Goods in desk",
      ref: result.report.noteRef,
      // Carried from the note so the shelf-life view has a real date for
      // it, rather than the date being read once and thrown away.
      bestBefore: l.bestBefore,
      note: l.quarantine ? "Quarantine hold — arrival temperature out of spec" : undefined,
    }));
    onBook(ms);

    // Mark them booked so a second press cannot duplicate the delivery,
    // and so each line visibly says where it went.
    const bookedIds = new Set(ready.map((l) => l.id));
    setResult((prev) =>
      prev ? { ...prev, lines: prev.lines.map((l) => (bookedIds.has(l.id) ? { ...l, booked: true } : l)) } : prev,
    );

    const q = ready.filter((l) => l.quarantine).length;
    const dest = locationById(into)?.name ?? "stock";
    setBooked(
      `${ms.length} ${ms.length === 1 ? "line" : "lines"} booked into ${dest}` +
        (q ? `, and ${q} into the quarantine hold.` : ".") +
        " Open Stock on hand to see them.",
    );
  }

  const target = locationById(into);
  const fits = (regime: Regime) => (target ? target.regimes.includes(regime) : false);

  const settled = result?.lines.filter((l) => l.state === "accepted" && !l.rejected && !l.booked) ?? [];
  const readyCount = settled.filter((l) => l.material && fits(l.material.regime)).length;

  // Lines that pass every check but cannot go where the dropdown points.
  // Chilled cream does not belong in a dry store, and letting it be
  // booked there is how product spoils with nobody having made a mistake
  // anyone can point to.
  const wrongPlace = settled.filter((l) => l.material && !fits(l.material.regime));
  const outstanding = result?.lines.filter((l) => l.state !== "accepted" && !l.rejected).length ?? 0;
  const bookedCount = result?.lines.filter((l) => l.booked).length ?? 0;

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        style={{
          border: `1.5px dashed ${drag ? TEAL : "var(--rule)"}`,
          background: drag ? "rgba(14,85,96,0.05)" : "var(--bg-elevated)",
          borderRadius: 14,
          padding: "30px 24px",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <p style={{ ...serifItal, fontSize: 21, marginBottom: 6 }}>
          {busy ? "Reading the note…" : "Drop a delivery note here"}
        </p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.55 }}>
          Supplier delivery notes, collection dockets and goods received notes, as PDF, .xlsx, .xls, .xlsm or .csv.
          <br />
          The desk finds the table wherever it sits on the page.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} className="btn btn-primary" disabled={busy}>
            Choose a file
          </button>
          <button
            onClick={loadSample}
            disabled={busy}
            style={{
              background: "none",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: "inherit",
            }}
          >
            Read the sample note
          </button>
        </div>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 14, lineHeight: 1.6 }}>
          No note to hand?{" "}
          <a href={SAMPLE_URL} download style={{ color: TEAL, textDecoration: "underline" }}>
            Download a sample delivery note
          </a>{" "}
          and drop it in above. It is an invented supplier, written the way a real one arrives — letterhead,
          reference panel, then the lines.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.xlsm,.csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div style={{ ...card, borderLeft: `2px solid ${VERM}`, marginBottom: 20 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{error}</p>
        </div>
      )}

      {result && (
        <>
          <div style={{ ...card, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500 }}>{result.report.supplier ?? "Supplier not stated"}</p>
                <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                  {result.report.noteRef ?? "no note ref"} · {result.report.deliveryDate ?? "no date"} ·{" "}
                  {result.report.fileName}
                </p>
              </div>
              <p style={{ ...mono, fontSize: 11.5, color: MUTED }}>
                {result.report.sheetName ? `${result.report.sheetName} · ` : ""}
                {result.report.fileKind.toUpperCase()} · table from row {result.report.headerRow}
              </p>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
              <span>
                <Dot color={GREEN} />
                {result.report.accepted} ready
              </span>
              <span>
                <Dot color={BRASS} />
                {result.report.held} need a person
              </span>
              <span>
                <Dot color={VERM} />
                {result.report.exceptions} stopped
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {result.lines.map((l) => (
              <LineRow key={l.id} line={l} who={who} onSettle={(input) => settle(l.id, input)} />
            ))}
          </div>

          <div style={{ ...card, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: MUTED }}>
                Book into
                <select
                  value={into}
                  onChange={(e) => setInto(e.target.value)}
                  style={selectStyle}
                >
                  {LOCATIONS.filter((l) => l.id !== "WH-QUAR").map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13, color: MUTED }}>
                Received by
                <input
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  placeholder="M. Reeve"
                  style={{ ...inputStyle, marginLeft: 8, width: 150 }}
                />
              </label>
              <button onClick={book} className="btn btn-primary" disabled={readyCount === 0}>
                Book in {readyCount} {readyCount === 1 ? "line" : "lines"}
              </button>
            </div>
            {wrongPlace.length > 0 && (
              <div
                style={{
                  borderLeft: `2px solid ${BRASS}`,
                  background: "rgba(163,119,42,0.06)",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                <p style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 4 }}>
                  <Dot color={BRASS} />
                  {wrongPlace.length} {wrongPlace.length === 1 ? "line cannot" : "lines cannot"} go into{" "}
                  {target?.name}
                </p>
                {wrongPlace.map((l) => (
                  <p key={l.id} style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, lineHeight: 1.5 }}>
                    {l.material!.name} is {REGIME_LABEL[l.material!.regime].toLowerCase()} (
                    {REGIME_SPEC[l.material!.regime]}) — try{" "}
                    {locationsFor(l.material!)
                      .filter((x) => !x.holding)
                      .map((x) => x.name)
                      .join(" or ")}
                    .
                  </p>
                ))}
              </div>
            )}

            {booked && (
              <div
                style={{
                  borderLeft: `2px solid ${GREEN}`,
                  background: "rgba(22,122,91,0.06)",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                  <Dot color={GREEN} />
                  {booked}
                </p>
              </div>
            )}

            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>
              {bookedCount > 0 && `${bookedCount} of ${result.lines.length} lines booked. `}
              {outstanding > 0
                ? `${outstanding} ${outstanding === 1 ? "line still needs" : "lines still need"} a decision. Only lines that pass on their own are booked — settling one re-runs the checks rather than overriding them.`
                : readyCount === 0
                  ? "Every line on this note has been dealt with."
                  : "Every line has been settled and is ready to book."}
            </p>
          </div>
        </>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: "6px 10px",
  border: "1px solid var(--rule)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "inherit",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = { ...inputStyle, marginLeft: 8 };

const fixBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--rule)",
  borderRadius: 8,
  padding: "5px 11px",
  fontSize: 12.5,
  cursor: "pointer",
  color: "inherit",
  fontFamily: "inherit",
};

function LineRow({
  line,
  who,
  onSettle,
}: {
  line: GoodsLine;
  who: string;
  onSettle: (input: ResolveInput) => void;
}) {
  const [open, setOpen] = useState<IssueCode | null>(null);
  const [draft, setDraft] = useState("");

  const rejected = line.rejected === true;
  const color = rejected ? MUTED : STATE_COLOR[line.state];
  const word = rejected
    ? "Rejected"
    : line.booked
      ? line.quarantine
        ? "Booked to quarantine"
        : "Booked in"
      : line.quarantine
        ? "Quarantined"
        : STATE_WORD[line.state];

  const by = who.trim() || "Goods in desk";

  // One control per issue code. The prohibited screen emits two lines of
  // text — the stop and the caveat — and rendering a button per issue
  // gave two identical Reject buttons.
  const seen = new Set<IssueCode>();
  const actionable = line.issues.filter((i) => {
    if (i.code === "unit-assumed" || seen.has(i.code)) return false;
    seen.add(i.code);
    return true;
  });

  function fire(input: ResolveInput) {
    onSettle(input);
    setOpen(null);
    setDraft("");
  }

  return (
    <div
      style={{
        ...card,
        borderLeft: `2px solid ${color}`,
        padding: "12px 16px",
        opacity: rejected ? 0.62 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 14, fontWeight: 500, textDecoration: rejected ? "line-through" : undefined }}>
          <Dot color={color} />
          {line.rawMaterial}
        </p>
        <span style={{ ...mono, fontSize: 12, color }}>{word}</span>
      </div>

      <p style={{ ...mono, fontSize: 11.5, color: MUTED, paddingLeft: 16, marginTop: 4 }}>
        {line.material ? `${line.material.code} · ` : ""}
        {line.qty !== null ? `${line.qty}${line.unit ? ` ${line.unit}` : ""}` : "no quantity"}
        {line.lot ? ` · lot ${line.lot}` : " · no lot"}
        {line.tempC !== undefined && line.tempC !== null ? ` · ${line.tempC}°C` : ""}
        {line.bestBefore ? ` · BBE ${line.bestBefore}` : ""} · note row {line.sourceRow}
      </p>

      {line.issues.map((issue, n) => (
        <div key={n} style={{ paddingLeft: 16, marginTop: 6 }}>
          <p
            style={{
              fontSize: 12.5,
              color: line.state === "exception" && !rejected ? VERM : MUTED,
              lineHeight: 1.5,
            }}
          >
            {issue.text}
          </p>
        </div>
      ))}

      {!rejected && !line.booked && actionable.length > 0 && (
        <div style={{ paddingLeft: 16, marginTop: 10, display: "grid", gap: 8 }}>
          {actionable.map((issue) => (
            <div key={issue.code}>
              {open !== issue.code && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {issue.code === "prohibited" ? (
                    <button style={{ ...fixBtn, borderColor: VERM, color: VERM }} onClick={() => fire({ code: "prohibited", by })}>
                      Reject and record
                    </button>
                  ) : issue.code === "temp-breach" ? (
                    <>
                      <button style={{ ...fixBtn, borderColor: VERM, color: VERM }} onClick={() => fire({ code: "temp-breach", decision: "reject", by })}>
                        Reject the line
                      </button>
                      <button style={fixBtn} onClick={() => fire({ code: "temp-breach", decision: "quarantine", by })}>
                        Take into quarantine
                      </button>
                    </>
                  ) : issue.code === "unit-mismatch" ? (
                    <>
                      <button style={fixBtn} onClick={() => fire({ code: "unit-mismatch", keep: "register", by })}>
                        Quantity is right, unit is a typo
                      </button>
                      <button style={{ ...fixBtn, borderColor: VERM, color: VERM }} onClick={() => fire({ code: "unit-mismatch", keep: "reject", by })}>
                        Reject the line
                      </button>
                    </>
                  ) : (
                    <button style={fixBtn} onClick={() => { setOpen(issue.code); setDraft(issue.code === "quantity-outlier" ? String(line.qty ?? "") : ""); }}>
                      {issue.code === "no-lot"
                        ? "Enter the lot code"
                        : issue.code === "unknown-material"
                          ? "Match to a material"
                          : "Enter the quantity"}
                    </button>
                  )}
                </div>
              )}

              {open === issue.code && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {issue.code === "unknown-material" ? (
                    <select value={draft} onChange={(e) => setDraft(e.target.value)} style={{ ...inputStyle, minWidth: 220 }}>
                      <option value="">Choose a material…</option>
                      {MATERIALS.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={issue.code === "no-lot" ? "e.g. PKG-2609-E" : "e.g. 1850"}
                      style={{ ...inputStyle, width: 170 }}
                    />
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12.5, padding: "6px 12px" }}
                    disabled={!draft.trim()}
                    onClick={() => {
                      if (issue.code === "no-lot") fire({ code: "no-lot", lot: draft, by });
                      else if (issue.code === "unknown-material") fire({ code: "unknown-material", materialCode: draft, by });
                      else {
                        const n = parseFloat(draft.replace(/[^\d.\-]/g, ""));
                        if (Number.isFinite(n)) {
                          fire(issue.code === "quantity-outlier" ? { code: "quantity-outlier", qty: n, by } : { code: "no-quantity", qty: n, by });
                        }
                      }
                    }}
                  >
                    Confirm
                  </button>
                  <button style={{ ...fixBtn, border: "none", color: MUTED }} onClick={() => { setOpen(null); setDraft(""); }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {line.booked && (
        <p style={{ ...mono, fontSize: 10.5, color: GREEN, paddingLeft: 16, marginTop: 6 }}>
          {line.quarantine ? "Booked to the quarantine hold" : "Booked into stock"}
        </p>
      )}

      {line.resolutions && line.resolutions.length > 0 && (
        <div style={{ paddingLeft: 16, marginTop: 8, borderTop: "1px solid var(--rule)", paddingTop: 7 }}>
          {line.resolutions.map((r, n) => (
            <p key={n} style={{ ...mono, fontSize: 10.5, color: MUTED, lineHeight: 1.6 }}>
              {r.action} · {r.by}
              {r.note ? ` · ${r.note}` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ————————————————————————— stock on hand —————————————————————————

const FRESH_COLOR: Record<Freshness, string> = {
  fresh: GREEN,
  soon: BRASS,
  urgent: VERM,
  expired: VERM,
  unknown: MUTED,
};

type GroupBy = "category" | "regime" | "location" | "line";

const GROUP_LABEL: Record<GroupBy, string> = {
  category: "By ingredient type",
  regime: "By storage",
  location: "By location",
  line: "By product line",
};

function Pills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {options.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            background: value === id ? "rgba(14,85,96,0.08)" : "none",
            border: "1px solid var(--rule)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12.5,
            cursor: "pointer",
            color: "inherit",
            fontWeight: value === id ? 600 : 400,
            fontFamily: "inherit",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function GroupHead({ text }: { text: string }) {
  return (
    <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 8 }}>
      {text.toUpperCase()}
    </p>
  );
}

function OnHandTab({ movements }: { movements: Movement[] }) {
  const [by, setBy] = useState<GroupBy>("category");
  const groups = useMemo(() => groupBalances(movements, by), [movements, by]);
  const wrong = useMemo(() => misplaced(movements), [movements]);
  const [lot, setLot] = useState<{ code: string; lot: string } | null>(null);

  return (
    <>
      <Pills<GroupBy>
        value={by}
        onChange={setBy}
        options={(Object.keys(GROUP_LABEL) as GroupBy[]).map((k) => [k, GROUP_LABEL[k]])}
      />

      {wrong.length > 0 && (
        <div style={{ ...card, borderLeft: `2px solid ${VERM}`, marginBottom: 18 }}>
          <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
            <Dot color={VERM} />
            {wrong.length} {wrong.length === 1 ? "lot is" : "lots are"} stored somewhere that cannot hold it
          </p>
          {wrong.map((w) => (
            <p key={`${w.balance.materialCode}-${w.balance.lot}`} style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, lineHeight: 1.5 }}>
              {w.reason}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {groups.map((g) => (
          <div key={g.key}>
            <GroupHead text={g.label} />
            <div style={{ display: "grid", gap: 6 }}>
              {g.items.map((b) => {
                const f = freshnessOf(b.bestBefore);
                return (
                  <button
                    key={`${b.materialCode}-${b.lot}-${b.locationId}`}
                    onClick={() => setLot({ code: b.materialCode, lot: b.lot })}
                    style={{
                      ...card,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 14,
                      padding: "11px 15px",
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14 }}>{b.material?.name ?? b.materialCode}</p>
                      <p style={{ ...mono, fontSize: 10.5, color: MUTED, marginTop: 2 }}>
                        lot {b.lot} · {b.location?.name}
                        {b.material?.origin ? ` · ${b.material.origin}` : ""}
                        {b.bestBefore ? ` · BBE ${b.bestBefore}` : ""}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ ...mono, fontSize: 15, fontWeight: 500 }}>{fmtQty(b.qty, b.unit)}</p>
                      {f.state !== "fresh" && f.state !== "unknown" && (
                        <p style={{ ...mono, fontSize: 10.5, color: FRESH_COLOR[f.state], marginTop: 2 }}>
                          {FRESHNESS_LABEL[f.state]}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {lot && <LotTrace movements={movements} code={lot.code} lot={lot.lot} onClose={() => setLot(null)} />}
    </>
  );
}

// ————————————————————————— shelf life —————————————————————————

function ShelfLifeTab({ movements }: { movements: Movement[] }) {
  const rows = useMemo(() => shelfLife(movements), [movements]);
  const pressing = rows.filter((r) => r.state === "expired" || r.state === "urgent" || r.state === "soon");

  return (
    <>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.55, maxWidth: 640 }}>
        Every lot in date order, soonest first. Dates come off the delivery note at goods-in, so nothing here is
        re-keyed. On a perishable product across six sites this is the difference between a markdown and a skip.
      </p>

      {pressing.length === 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <p style={{ fontSize: 13.5 }}>
            <Dot color={GREEN} />
            Nothing is within a month of its date.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        {rows.map((r) => (
          <div
            key={`${r.balance.materialCode}-${r.balance.lot}-${r.balance.locationId}`}
            style={{
              ...card,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              padding: "11px 15px",
              borderLeft: r.state === "fresh" || r.state === "unknown" ? undefined : `2px solid ${FRESH_COLOR[r.state]}`,
            }}
          >
            <div>
              <p style={{ fontSize: 14 }}>
                <Dot color={FRESH_COLOR[r.state]} />
                {r.balance.material?.name ?? r.balance.materialCode}
              </p>
              <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 2 }}>
                lot {r.balance.lot} · {r.balance.location?.name} · {fmtQty(r.balance.qty, r.balance.unit)}
              </p>
            </div>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <p style={{ ...mono, fontSize: 13, color: FRESH_COLOR[r.state], fontWeight: 500 }}>
                {r.balance.bestBefore ?? "—"}
              </p>
              <p style={{ ...mono, fontSize: 10.5, color: MUTED, marginTop: 2 }}>
                {r.days === null
                  ? FRESHNESS_LABEL[r.state]
                  : r.days < 0
                    ? `${Math.abs(r.days)}d past`
                    : `${r.days}d left`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ————————————————————————— allergens —————————————————————————

function AllergenTab({ movements }: { movements: Movement[] }) {
  const rows = useMemo(() => allergenPosition(movements), [movements]);
  const gaps = useMemo(() => declarationGaps(movements), [movements]);

  return (
    <>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.55, maxWidth: 640 }}>
        Everything currently held, what is in it, and whether the supplier declaration behind it is on file. This is
        the question a trade buyer&rsquo;s auditor asks, and it is answered from the register rather than from memory.
      </p>

      <div style={{ ...card, marginBottom: 16 }}>
        <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 6 }}>
          SITE CLAIM
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.55 }}>
          Free from {SITE_FREE_FROM.join(", ")} across the whole factory. Milk is present throughout — this is a
          dairy, and saying so plainly is what makes the rest credible.
        </p>
      </div>

      {gaps.length > 0 && (
        <div style={{ ...card, borderLeft: `2px solid ${BRASS}`, marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>
            <Dot color={BRASS} />
            {gaps.length} material{gaps.length === 1 ? "" : "s"} held with no current declaration
          </p>
          <p style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, lineHeight: 1.55 }}>
            {gaps.map((g) => g.name).join(", ")}. Not a crisis, but this is the gap an audit finds — chase the
            declaration before the re-audit window rather than during it.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        {rows.map((r) => (
          <div key={r.material.code} style={{ ...card, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontSize: 14 }}>
                <Dot color={r.declarationOnFile ? GREEN : BRASS} />
                {r.material.name}
              </p>
              <span style={{ ...mono, fontSize: 11.5, color: r.declarationOnFile ? MUTED : BRASS }}>
                {r.declarationOnFile
                  ? `Declaration held${r.declarationReviewed ? ` · ${r.declarationReviewed}` : ""}`
                  : "No declaration on file"}
              </span>
            </div>
            <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 3 }}>
              {r.material.code} · {CATEGORY_LABEL[r.material.category]} · {KIND_LABEL[r.material.kind]}
              {r.material.supplier ? ` · ${r.material.supplier}` : ""}
            </p>
            <p style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, marginTop: 4, lineHeight: 1.5 }}>
              {r.present.length > 0
                ? `Contains ${r.present.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}.`
                : "No allergens present."}
              {r.material.allergenNote ? ` ${r.material.allergenNote}` : ""}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

// ————————————————————————— holds —————————————————————————

function HoldsTab({ movements }: { movements: Movement[] }) {
  const held = useMemo(
    () => balances(movements).filter((b) => b.location?.holding),
    [movements],
  );

  return (
    <>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.55, maxWidth: 640 }}>
        Stock taken in but not released. Physically on site, deliberately not free to use, and waiting on a decision
        from someone. Nothing leaves here without that decision being recorded against it.
      </p>

      {held.length === 0 ? (
        <div style={{ ...card }}>
          <p style={{ fontSize: 13.5 }}>
            <Dot color={GREEN} />
            Nothing is on hold.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {held.map((b) => {
            const m = movements.find((x) => x.materialCode === b.materialCode && x.lot === b.lot && x.locationId === b.locationId);
            return (
              <div key={`${b.materialCode}-${b.lot}`} style={{ ...card, borderLeft: `2px solid ${BRASS}`, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 14 }}>
                    <Dot color={BRASS} />
                    {b.material?.name ?? b.materialCode}
                  </p>
                  <span style={{ ...mono, fontSize: 14, fontWeight: 500 }}>{fmtQty(b.qty, b.unit)}</span>
                </div>
                <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 3 }}>
                  lot {b.lot} · {b.location?.name}
                  {m?.at ? ` · held since ${m.at}` : ""}
                  {m?.ref ? ` · ${m.ref}` : ""}
                </p>
                {m?.note && (
                  <p style={{ fontSize: 12.5, color: MUTED, paddingLeft: 16, marginTop: 4, lineHeight: 1.5 }}>{m.note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Where a lot sits right now, across the estate. This is the query a
// recall runs, and the reason lot capture at goods-in earns its keep.
function LotTrace({
  movements,
  code,
  lot,
  onClose,
}: {
  movements: Movement[];
  code: string;
  lot: string;
  onClose: () => void;
}) {
  const where = whereIsLot(movements, code, lot);
  const history = movements.filter((m) => m.materialCode === code && m.lot === lot);
  const material = MATERIALS.find((m) => m.code === code);

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
        <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 6 }}>
          LOT {lot.toUpperCase()}
        </p>
        <h2 style={{ ...serifItal, fontSize: 25, marginBottom: 16 }}>{material?.name ?? code}</h2>

        <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 8 }}>
          WHERE IT IS NOW
        </p>
        <div style={{ display: "grid", gap: 6, marginBottom: 20 }}>
          {where.length === 0 && <p style={{ fontSize: 13, color: MUTED }}>Nothing of this lot remains in stock.</p>}
          {where.map((w) => (
            <div key={w.locationId} style={{ ...card, display: "flex", justifyContent: "space-between", padding: "10px 14px" }}>
              <span style={{ fontSize: 13.5 }}>
                {w.location?.name}
                <span style={{ color: MUTED }}> · {w.location ? KIND_WORD[w.location.kind] : ""}</span>
              </span>
              <span style={{ ...mono, fontSize: 13.5, fontWeight: 500 }}>{fmtQty(w.qty, w.unit)}</span>
            </div>
          ))}
        </div>

        <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 8 }}>
          EVERY MOVEMENT
        </p>
        <div style={{ display: "grid", gap: 5 }}>
          {history.map((m) => (
            <div key={m.id} style={{ ...card, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }}>
                  <Dot color={m.qty >= 0 ? GREEN : BLUE} />
                  {REASON_WORD[m.reason]} · {locationById(m.locationId)?.name}
                </span>
                <span style={{ ...mono, fontSize: 13, fontWeight: 500, color: m.qty >= 0 ? GREEN : BLUE }}>
                  {m.qty >= 0 ? "+" : ""}
                  {fmtQty(m.qty, m.unit)}
                </span>
              </div>
              <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 2 }}>
                {m.at} · {m.by}
                {m.ref ? ` · ${m.ref}` : ""}
                {m.note ? ` · ${m.note}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ————————————————————————— movement log —————————————————————————

function LogTab({ movements }: { movements: Movement[] }) {
  return (
    <>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 1.55, maxWidth: 620 }}>
        Append only. A correction is a further movement, never an edit, so the log always explains how a balance got
        where it is.
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {movements.map((m) => {
          const material = MATERIALS.find((x) => x.code === m.materialCode);
          return (
            <div key={m.id} style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "11px 15px" }}>
              <div>
                <p style={{ fontSize: 13.5 }}>
                  <Dot color={m.qty >= 0 ? GREEN : BLUE} />
                  {material?.name ?? m.materialCode}
                  <span style={{ color: MUTED }}> · {REASON_WORD[m.reason]}</span>
                </p>
                <p style={{ ...mono, fontSize: 10.5, color: MUTED, paddingLeft: 16, marginTop: 2 }}>
                  lot {m.lot} · {locationById(m.locationId)?.name} · {m.at} · {m.by}
                  {m.ref ? ` · ${m.ref}` : ""}
                </p>
              </div>
              <span style={{ ...mono, fontSize: 14, fontWeight: 500, color: m.qty >= 0 ? GREEN : BLUE, whiteSpace: "nowrap" }}>
                {m.qty >= 0 ? "+" : ""}
                {fmtQty(m.qty, m.unit)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
