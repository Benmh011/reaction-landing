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
  balancesAt,
  fmtQty,
  locationById,
  totalsByMaterial,
  whereIsLot,
  REASON_WORD,
  type Movement,
  type StockLocation,
} from "./stock";
import { parseGoodsIn, type GoodsIn, type GoodsLine } from "./goodsin";

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

type Tab = "goodsin" | "onhand" | "log";

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
      const res = await fetch("/samples/westridge-delivery-note.xlsx");
      if (!res.ok) throw new Error("The sample note could not be loaded.");
      const blob = await res.blob();
      const file = new File([blob], "westridge-delivery-note.xlsx", { type: blob.type });
      const out = await parseGoodsIn(file);
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The sample note could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  function book() {
    if (!result) return;
    const ready = result.lines.filter((l) => l.state === "accepted" && l.material && l.qty);
    const ms: Movement[] = ready.map((l, i) => ({
      id: `gi-${Date.now()}-${i}`,
      materialCode: l.material!.code,
      lot: l.lot,
      locationId: into,
      qty: l.qty!,
      unit: l.material!.unit,
      reason: "goods-in",
      at: result.report.deliveryDate ?? "Today",
      by: "Goods in desk",
      ref: result.report.noteRef,
    }));
    onBook(ms);
    setBooked(`${ms.length} ${ms.length === 1 ? "line" : "lines"} booked into ${locationById(into)?.name}.`);
  }

  const readyCount = result?.lines.filter((l) => l.state === "accepted").length ?? 0;

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
          Supplier delivery notes, collection dockets and goods received notes, as .xlsx, .xls, .xlsm or .csv.
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
            Try the sample note
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
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

      {booked && (
        <div style={{ ...card, borderLeft: `2px solid ${GREEN}`, marginBottom: 20 }}>
          <p style={{ fontSize: 13.5 }}>
            <Dot color={GREEN} />
            {booked} Held lines stay on this note until someone deals with them.
          </p>
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
                {result.report.sheetName ? `${result.report.sheetName} · ` : ""}table from row {result.report.headerRow}
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
              <LineRow key={l.id} line={l} />
            ))}
          </div>

          <div style={{ ...card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, color: MUTED }}>
              Book into
              <select
                value={into}
                onChange={(e) => setInto(e.target.value)}
                style={{
                  marginLeft: 8,
                  fontSize: 13,
                  padding: "6px 10px",
                  border: "1px solid var(--rule)",
                  borderRadius: 8,
                  background: "var(--bg)",
                  color: "inherit",
                }}
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={book} className="btn btn-primary" disabled={readyCount === 0}>
              Book in {readyCount} {readyCount === 1 ? "line" : "lines"}
            </button>
            <p style={{ fontSize: 12, color: MUTED, flex: 1, minWidth: 240, lineHeight: 1.5 }}>
              Only lines the desk fully understood are booked. Everything else stays here.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function LineRow({ line }: { line: GoodsLine }) {
  const color = STATE_COLOR[line.state];
  return (
    <div style={{ ...card, borderLeft: `2px solid ${color}`, padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 14, fontWeight: 500 }}>
          <Dot color={color} />
          {line.rawMaterial}
        </p>
        <span style={{ ...mono, fontSize: 12, color }}>{STATE_WORD[line.state]}</span>
      </div>

      <p style={{ ...mono, fontSize: 11.5, color: MUTED, paddingLeft: 16, marginTop: 4 }}>
        {line.material ? `${line.material.code} · ` : ""}
        {line.qty !== null ? `${line.qty}${line.unit ? ` ${line.unit}` : ""}` : "no quantity"}
        {line.lot ? ` · lot ${line.lot}` : " · no lot"}
        {line.tempC !== undefined && line.tempC !== null ? ` · ${line.tempC}°C` : ""}
        {line.bestBefore ? ` · BBE ${line.bestBefore}` : ""} · note row {line.sourceRow}
      </p>

      {line.issues.map((i, n) => (
        <p
          key={n}
          style={{
            fontSize: 12.5,
            color: line.state === "exception" ? VERM : MUTED,
            paddingLeft: 16,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {i}
        </p>
      ))}
    </div>
  );
}

// ————————————————————————— stock on hand —————————————————————————

function OnHandTab({ movements }: { movements: Movement[] }) {
  const [by, setBy] = useState<"material" | "location">("material");
  const totals = useMemo(() => totalsByMaterial(movements), [movements]);
  const all = useMemo(() => balances(movements), [movements]);
  const [lot, setLot] = useState<{ code: string; lot: string } | null>(null);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["material", "By material"],
            ["location", "By location"],
          ] as ["material" | "location", string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setBy(id)}
            style={{
              background: by === id ? "rgba(14,85,96,0.08)" : "none",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12.5,
              cursor: "pointer",
              color: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {by === "material" && (
        <div style={{ display: "grid", gap: 8 }}>
          {totals.map((t) => (
            <div key={t.material.code} style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto", gap: 14 }}>
              <div>
                <p style={{ fontSize: 14.5 }}>{t.material.name}</p>
                <p style={{ ...mono, fontSize: 11, color: MUTED, marginTop: 2 }}>
                  {t.material.code} · {t.material.kind} · {t.lots} {t.lots === 1 ? "lot" : "lots"} across {t.locations}{" "}
                  {t.locations === 1 ? "location" : "locations"}
                </p>
              </div>
              <span style={{ ...mono, fontSize: 17, fontWeight: 500, whiteSpace: "nowrap" }}>
                {fmtQty(t.total, t.unit)}
              </span>
            </div>
          ))}
        </div>
      )}

      {by === "location" && (
        <div style={{ display: "grid", gap: 14 }}>
          {LOCATIONS.map((loc) => {
            const bs = balancesAt(movements, loc.id);
            if (bs.length === 0) return null;
            return (
              <div key={loc.id}>
                <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 8 }}>
                  {loc.name.toUpperCase()} · {KIND_WORD[loc.kind].toUpperCase()} · {loc.site.toUpperCase()}
                </p>
                <div style={{ display: "grid", gap: 6 }}>
                  {bs.map((b) => (
                    <button
                      key={`${b.materialCode}-${b.lot}`}
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
                        <p style={{ ...mono, fontSize: 11, color: MUTED, marginTop: 2 }}>lot {b.lot}</p>
                      </div>
                      <span style={{ ...mono, fontSize: 15, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {fmtQty(b.qty, b.unit)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lot && <LotTrace movements={movements} code={lot.code} lot={lot.lot} onClose={() => setLot(null)} />}
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
