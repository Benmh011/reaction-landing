"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DOCUMENTS, TRAINING, PRODUCTION_LOG, QUESTIONNAIRES, type Status } from "./data";
import { SEED_READINGS, exceptions as checkExceptions } from "./checks";
import { SEED_MOVEMENTS, shelfLife, declarationGaps, balances, misplaced, loadMovements, saveMovements, type Movement } from "./stock";
import QuestionnaireDesk from "./QuestionnaireDesk";
import Welcome from "./Welcome";
import StockDesk from "./StockDesk";
import CheckDesk from "./CheckDesk";
import SopDesk from "./SopDesk";
import RecallDesk from "./RecallDesk";
import MonitorDesk from "./MonitorDesk";
import { source as telemetry, board as telemetryBoard } from "./telemetry";
import { SEED_RUNS, schedule as sopSchedule, sopById, fmtAgo, minsAgo as runMinsAgo } from "./sop";

// ————————————————————————————————————————————————————————————————
// Salcombe Dairy — demonstration build.
//
// One client component, all sample data, no persistence. Navy and
// off-white are the house colours; gold appears once, on the marker
// that shows where you are. Fraunces carries the names and titles,
// Plex carries everything you read or type, and Plex Mono carries
// anything that is a record — a lot code, a reading, a reference.
// ————————————————————————————————————————————————————————————————

// ————— status colours: semantic, not brand, so unchanged —————
const GREEN = "#167a5b";
const BRASS = "#a3772a";
const VERM = "#c22f4e";
const BLUE = "#2c6e8a";
const MUTED = "var(--text-muted)";

const STATUS_COLOR: Record<Status, string> = { ok: GREEN, due: BRASS, overdue: VERM };
const STATUS_WORD: Record<Status, string> = { ok: "In date", due: "Due soon", overdue: "Overdue" };

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)" };
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

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

function Card({ children, pad = 20 }: { children: React.ReactNode; pad?: number }) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--rule)",
        borderRadius: 14,
        padding: pad,
      }}
    >
      {children}
    </div>
  );
}

// A title and, where it earns its place, one line under it. No label
// above it: the sidebar already says where you are.
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h2
        style={{
          ...serif,
          fontWeight: 500,
          fontSize: 30,
          lineHeight: 1.08,
          letterSpacing: "-0.01em",
          color: "var(--text)",
          marginBottom: sub ? 8 : 0,
        }}
      >
        {title}
      </h2>
      {sub && <p style={{ fontSize: 14.5, color: MUTED, maxWidth: 580, lineHeight: 1.55 }}>{sub}</p>}
    </header>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  color: MUTED,
  fontWeight: 500,
  padding: "0 12px 10px 0",
  borderBottom: "1px solid var(--rule)",
};
const td: React.CSSProperties = {
  fontSize: 13.5,
  padding: "11px 12px 11px 0",
  borderBottom: "1px solid var(--rule)",
  verticalAlign: "top",
};

// ————————————————————————— sections —————————————————————————

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "questionnaires", label: "Questionnaires" },
  { id: "documents", label: "Documents & audit" },
  { id: "trace", label: "Traceability" },
  { id: "stock", label: "Stock" },
  { id: "coldchain", label: "Cold chain" },
  { id: "production", label: "Production records" },
  { id: "checks", label: "Checks" },
  { id: "procedures", label: "Procedures" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ————————————————————————— the picture —————————————————————————
//
// Everything that needs a decision, read from the same engines the
// sections use rather than typed in beside them. A hardcoded alert and
// a computed one drift apart within a week; one source cannot.

type Item = { severe: boolean; text: string; goto: SectionId };

function buildPicture(movements: Movement[]): Item[] {
  const items: Item[] = [];

  for (const d of DOCUMENTS) {
    if (d.status === "overdue") items.push({ severe: true, text: `${d.name} review is overdue — was due ${d.next}.`, goto: "documents" });
    else if (d.status === "due") items.push({ severe: false, text: `${d.name} falls due ${d.next}.`, goto: "documents" });
  }
  for (const t of TRAINING) {
    if (t.status === "overdue") items.push({ severe: true, text: `${t.person}'s ${t.cert} certificate expired ${t.expires}.`, goto: "documents" });
    else if (t.status === "due") items.push({ severe: false, text: `${t.person}'s ${t.cert} certificate expires ${t.expires}.`, goto: "documents" });
  }

  // Live telemetry is the truth for the assets it covers. The check
  // engine's seeded readings still cover what it does not — the scales.
  const live = telemetryBoard(telemetry, 6 * 3_600_000);
  const covered = new Set(live.map((l) => l.asset.id));
  for (const l of live) {
    if (l.status === "ok" || !l.verdict) continue;
    const first = l.verdict.reason.split(/(?<=\.)\s/)[0];
    items.push({ severe: l.status === "overdue", text: `${l.asset.name}: ${first}`, goto: "coldchain" });
  }
  for (const e of checkExceptions(SEED_READINGS)) {
    if (covered.has(e.assetId)) continue;
    const first = e.reason.split(/(?<=\.)\s/)[0];
    items.push({ severe: e.status === "overdue", text: `${e.assetName}: ${first}`, goto: "checks" });
  }

  for (const r of shelfLife(movements)) {
    if (r.state === "expired")
      items.push({ severe: true, text: `${r.balance.material?.name ?? r.balance.materialCode} lot ${r.balance.lot} is past its date.`, goto: "stock" });
    else if (r.state === "urgent")
      items.push({ severe: false, text: `${r.balance.material?.name ?? r.balance.materialCode} lot ${r.balance.lot} has ${r.days} days left.`, goto: "stock" });
  }
  const held = balances(movements).filter((b) => b.location?.holding);
  if (held.length) items.push({ severe: false, text: `${held.length} ${held.length === 1 ? "lot is" : "lots are"} in quarantine awaiting a decision.`, goto: "stock" });
  for (const m of declarationGaps(movements)) items.push({ severe: false, text: `${m.name} is held with no supplier declaration on file.`, goto: "stock" });
  for (const w of misplaced(movements)) items.push({ severe: true, text: w.reason, goto: "stock" });

  for (const d of sopSchedule(SEED_RUNS)) {
    if (d.state === "due") items.push({ severe: false, text: `${d.sop.name} has not been run today.`, goto: "procedures" });
  }
  for (const r of SEED_RUNS) {
    if (r.outcome === "stopped" && runMinsAgo(r) < 60 * 12)
      items.push({ severe: true, text: `${sopById(r.sopId)?.name ?? r.sopId} was stopped ${fmtAgo(runMinsAgo(r))} by ${r.by} — ${r.stopAction?.split(/(?<=\.)\s/)[0] ?? "action outstanding"}`, goto: "procedures" });
  }

  for (const q of QUESTIONNAIRES) {
    if (q.open && q.drafted < q.questions)
      items.push({ severe: false, text: `${q.from} questionnaire drafted — ${q.questions - q.drafted} answers held for review.`, goto: "questionnaires" });
  }

  return items.sort((a, b) => Number(b.severe) - Number(a.severe));
}

function countsFor(items: Item[]) {
  const out: Record<SectionId, { n: number; severe: boolean }> = {
    overview: { n: 0, severe: false },
    questionnaires: { n: 0, severe: false },
    documents: { n: 0, severe: false },
    trace: { n: 0, severe: false },
    stock: { n: 0, severe: false },
    coldchain: { n: 0, severe: false },
    production: { n: 0, severe: false },
    checks: { n: 0, severe: false },
    procedures: { n: 0, severe: false },
  };
  for (const i of items) {
    out[i.goto].n += 1;
    if (i.severe) out[i.goto].severe = true;
    out.overview.n += 1;
    if (i.severe) out.overview.severe = true;
  }
  return out;
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(),
  );
}

function Overview({ items, onGo }: { items: Item[]; onGo: (id: SectionId) => void }) {
  const [today, setToday] = useState("");
  useEffect(() => setToday(todayLabel()), []);
  const label = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.label ?? id;

  return (
    <>
      <SectionTitle title="This morning's picture" sub={today ? `Island Street, ${today}. Everything that needs a decision, drawn from every register. Quiet lines are working lines.` : undefined} />
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((e, i) => (
          <button key={i} onClick={() => onGo(e.goto)} className="prov-item">
            <span className="prov-item-bar" style={{ background: e.severe ? VERM : BRASS }} />
            <span className="prov-item-text">{e.text}</span>
            <span className="prov-item-goto">{label(e.goto)}</span>
          </button>
        ))}
      </div>
      <p style={{ fontSize: 13, color: MUTED, marginTop: 18, lineHeight: 1.55 }}>
        {PRODUCTION_LOG.length} production records captured today. Last CCP check passed{" "}
        {PRODUCTION_LOG.filter((r) => r.kind === "ccp").slice(-1)[0]?.time ?? "—"}. Next audit window opens March 2027.
      </p>
    </>
  );
}

function Questionnaires() {
  return (
    <>
      <SectionTitle
        title="Spec questionnaires"
        sub="New stockists send these before they order — their workbook, their layout, their phrasing. The desk drafts every answer it can stand behind from your controlled documents, cites the source, and holds the rest for a person."
      />
      <QuestionnaireDesk />
    </>
  );
}

function Documents() {
  return (
    <>
      <SectionTitle
        title="Documents & audit readiness"
        sub="The controlled register the questionnaire answers draw from. Anything drifting out of date surfaces here long before an auditor finds it."
      />
      <div style={{ overflowX: "auto", marginBottom: 34 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr>
              <th style={th}>Document</th>
              <th style={th}>Ref</th>
              <th style={th}>Version</th>
              <th style={th}>Last review</th>
              <th style={th}>Next</th>
              <th style={th}>State</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((d) => (
              <tr key={d.ref}>
                <td style={td}>{d.name}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.ref}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.version}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.reviewed}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.next}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <Dot status={d.status} />
                  <span style={{ fontSize: 12.5, color: STATUS_COLOR[d.status] }}>{STATUS_WORD[d.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ ...serif, fontWeight: 500, fontSize: 19, color: "var(--text)", marginBottom: 12 }}>
        Training certificates
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={th}>Person</th>
              <th style={th}>Role</th>
              <th style={th}>Certificate</th>
              <th style={th}>Expires</th>
              <th style={th}>State</th>
            </tr>
          </thead>
          <tbody>
            {TRAINING.map((t) => (
              <tr key={t.person + t.cert}>
                <td style={td}>{t.person}</td>
                <td style={{ ...td, color: MUTED, fontSize: 13 }}>{t.role}</td>
                <td style={td}>{t.cert}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{t.expires}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <Dot status={t.status} />
                  <span style={{ fontSize: 12.5, color: STATUS_COLOR[t.status] }}>{STATUS_WORD[t.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductionLog() {
  const kindColor: Record<string, string> = { ccp: VERM, batch: BLUE, clean: BRASS, check: GREEN };
  return (
    <>
      <SectionTitle
        title="Production records"
        sub="Checks spoken aloud at the line — wet hands, gloves, cold room — land here as structured, timestamped records. No clipboard, no keying-in later."
      />
      <div style={{ display: "grid", gap: 0 }}>
        {PRODUCTION_LOG.map((r, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "52px 10px 1fr",
              gap: 14,
              alignItems: "start",
              padding: "13px 0",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <span style={{ ...mono, fontSize: 12.5, color: MUTED, paddingTop: 2 }}>{r.time}</span>
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                marginTop: 6,
                background: kindColor[r.kind] ?? MUTED,
              }}
            />
            <div>
              <p style={{ fontSize: 14 }}>{r.entry}</p>
              <p style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
                {r.who}, {r.via === "voice" ? "voice capture" : "instrument feed"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ————————————————————————— shell —————————————————————————

// The one moving part in the sidebar. A single gold bar that measures the
// active item and glides to it, so the navigation reads as one thing
// rather than seven buttons taking turns.
function useMarker(active: SectionId) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = refs.current[active];
    if (!el) return;
    const measure = () => setBox({ top: el.offsetTop, height: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  return { refs, box };
}

export type AppUser = { name?: string | null; email?: string | null };

export default function ProvenanceApp({ user }: { user?: AppUser | null }) {
  const [view, setView] = useState<"start" | SectionId>("start");
  // The name that goes on records. A person's name where the account has
  // one, the email where it does not — never a blank, never a text box a
  // second person could type someone else's name into.
  const operator = (user?.name && user.name.trim()) || user?.email || "";

  // The stock log lives here so that every desk reads and writes the same
  // one, and so it survives moving between sections. Loaded from the
  // browser after mount, saved whenever it changes.
  const [movements, setMovements] = useState<Movement[]>(SEED_MOVEMENTS);
  const [stockLoaded, setStockLoaded] = useState(false);
  useEffect(() => {
    setMovements(loadMovements());
    setStockLoaded(true);
  }, []);
  useEffect(() => {
    if (stockLoaded) saveMovements(movements);
  }, [movements, stockLoaded]);

  const picture = useMemo(() => buildPicture(movements), [movements]);
  const counts = useMemo(() => countsFor(picture), [picture]);
  const { refs, box } = useMarker(view === "start" ? "overview" : view);

  if (view === "start") {
    return (
      <div className="pv-root">
        <Welcome onEnter={() => setView("overview")} />
        <ThemeStyles />
      </div>
    );
  }
  const active = view;

  return (
    <div className="pv-root">
      <div className="prov-shell">
        <aside className="prov-side">
          <button
            onClick={() => setView("start")}
            className="prov-wordmark"
            aria-label="Back to start"
          >
            Salcombe Dairy
          </button>

          <nav aria-label="Sections" className="prov-nav">
            {box && <span className="prov-marker" style={{ top: box.top, height: box.height }} aria-hidden />}
            {SECTIONS.map((s) => {
              const on = s.id === active;
              const c = counts[s.id];
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    refs.current[s.id] = el;
                  }}
                  onClick={() => setView(s.id)}
                  className="prov-navitem"
                  aria-current={on ? "page" : undefined}
                >
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {c.n > 0 && <span className={`pv-flag${c.severe ? " pv-flag-severe" : ""}`}>{c.n}</span>}
                </button>
              );
            })}
          </nav>

          <div className="prov-sidefoot">
            {operator && (
              <p style={{ marginBottom: 6, color: "var(--on-navy)" }}>
                Signed in as <span style={{ ...mono, fontSize: 11.5 }}>{operator}</span>
              </p>
            )}
            <p>A demonstration. All figures are sample data.</p>
          </div>
        </aside>

        <main className="prov-main">
          <div key={active} className="prov-view">
            {active === "overview" && <Overview items={picture} onGo={setView} />}
            {active === "questionnaires" && <Questionnaires />}
            {active === "documents" && <Documents />}
            {active === "trace" && <RecallDesk movements={movements} onMovements={setMovements} operator={operator} />}
            {active === "stock" && <StockDesk operator={operator} movements={movements} onMovements={setMovements} />}
            {active === "coldchain" && <MonitorDesk />}
            {active === "production" && <ProductionLog />}
            {active === "checks" && <CheckDesk operator={operator} />}
            {active === "procedures" && <SopDesk operator={operator} />}
          </div>
        </main>
      </div>
      <ThemeStyles />
    </div>
  );
}

function ThemeStyles() {
  return (
    <style>{`
        /* Salcombe Dairy theme, scoped — the rest of the site keeps its own palette */
        .pv-root {
          --bg:           #f4efe4;
          --bg-surface:   #ebe4d3;
          --bg-elevated:  #fbf8f0;
          --text:         #14213a;
          --text-soft:    #3b4356;
          --text-muted:   #6f7482;
          --rule:         #e0d9c8;
          --rule-strong:  #c6bfab;
          --navy:         #10284a;
          --navy-deep:    #0a1b33;
          --gold:         #c9a24a;
          --on-navy:      #dfe6ef;
          --on-navy-soft: #8f9db3;
          --accent:       var(--navy);
          --font-serif:   var(--font-fraunces, 'Fraunces'), Georgia, 'Times New Roman', serif;
          --font-sans:    var(--font-plex, 'IBM Plex Sans'), system-ui, -apple-system, 'Segoe UI', sans-serif;
          --font-mono:    var(--font-plex-mono, 'IBM Plex Mono'), 'JetBrains Mono', ui-monospace, monospace;
          font-family: var(--font-sans);
          background: var(--bg);
          color: var(--text-soft);
          min-height: 100vh;
        }
        .pv-root .btn-primary { background: var(--navy); color: #f4efe4; font-family: var(--font-sans); }
        .pv-root .btn-primary:hover:not(:disabled) { background: var(--navy-deep); }
        .pv-root .btn-ghost { color: var(--navy); font-family: var(--font-sans); }
        .pv-root button, .pv-root input, .pv-root select { font-family: var(--font-sans); }
        .pv-root :focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

        .pv-flag {
          font-family: var(--font-mono);
          font-size: 10.5px;
          min-width: 18px;
          text-align: center;
          padding: 2px 5px;
          border-radius: 99px;
          color: var(--navy);
          background: rgba(201,162,74,0.85);
          display: inline-block;
          line-height: 1.4;
        }
        .pv-flag-severe { color: #fbf8f0; background: ${VERM}; }

        .prov-shell {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100vh;
          background: var(--bg);
        }
        .prov-side {
          display: flex;
          flex-direction: column;
          padding: 28px 16px 24px 22px;
          background: var(--navy);
          color: var(--on-navy);
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .prov-wordmark {
          font-family: var(--font-serif);
          font-weight: 500;
          font-size: 23px;
          letter-spacing: 0.005em;
          line-height: 1.1;
          color: #f4efe4;
          background: none;
          border: none;
          padding: 0;
          margin: 0 0 34px;
          text-align: left;
          cursor: pointer;
        }
        .prov-nav { position: relative; display: grid; gap: 2px; }
        .prov-marker {
          position: absolute;
          left: 0;
          width: 3px;
          border-radius: 2px;
          background: var(--gold);
          transition: top 260ms cubic-bezier(.2,.7,.2,1), height 260ms cubic-bezier(.2,.7,.2,1);
          pointer-events: none;
        }
        .prov-navitem {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          text-align: left;
          font-size: 14px;
          font-weight: 400;
          color: var(--on-navy-soft);
          background: transparent;
          border: none;
          border-radius: 0 9px 9px 0;
          padding: 9px 12px 9px 16px;
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease;
        }
        .prov-navitem:hover { color: var(--on-navy); }
        .prov-navitem[aria-current="page"] {
          color: #f4efe4;
          font-weight: 500;
          background: rgba(255,255,255,0.06);
        }
        .prov-sidefoot {
          margin-top: auto;
          padding-top: 24px;
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--on-navy-soft);
        }
        .prov-main {
          padding: 36px clamp(20px, 4.5vw, 56px) 64px;
          max-width: 980px;
        }

        .prov-item {
          display: grid;
          grid-template-columns: 3px 1fr auto;
          gap: 14px;
          align-items: center;
          background: var(--bg-elevated);
          border: 1px solid var(--rule);
          border-radius: 12px;
          padding: 13px 16px;
          text-align: left;
          cursor: pointer;
          font: inherit;
          color: inherit;
          transition: border-color 160ms ease;
        }
        .prov-item:hover { border-color: var(--rule-strong); }
        .prov-item-bar { width: 3px; align-self: stretch; border-radius: 2px; }
        .prov-item-text { font-size: 14px; line-height: 1.45; }
        .prov-item-goto { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
        @media (max-width: 600px) {
          .prov-item { grid-template-columns: 3px 1fr; }
          .prov-item-bar { grid-row: 1 / span 2; }
          .prov-item-goto { grid-column: 2; margin-top: -6px; }
        }

        /* The content settles into place: a short fade up from a few
           pixels below. It arrives; it does not perform. */
        .prov-view { animation: provsettle 240ms cubic-bezier(.2,.7,.2,1); }
        @keyframes provsettle {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .prov-view { animation: none; }
          .prov-marker { transition: none; }
        }

        .prov-chain {
          display: grid;
          grid-template-columns: 1fr 120px 1fr;
          gap: 8px;
          align-items: center;
        }
        .prov-node { display: flex; align-items: center; }
        .prov-line { flex: 1; height: 1px; background: var(--rule-strong); }
        .prov-station {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border-radius: 99px;
          background: var(--navy);
          flex-shrink: 0;
        }
        @media (max-width: 860px) {
          .prov-shell { grid-template-columns: 1fr; }
          .prov-side {
            position: static;
            height: auto;
            flex-direction: row;
            align-items: center;
            gap: 14px;
            overflow-x: auto;
            padding: 14px 16px;
          }
          .prov-wordmark { margin: 0; flex-shrink: 0; font-size: 19px; }
          .prov-nav { display: flex; gap: 4px; }
          .prov-marker { display: none; }
          .prov-navitem { white-space: nowrap; border-bottom: 2px solid transparent; border-radius: 8px; padding: 8px 10px; }
          .prov-navitem[aria-current="page"] { border-bottom-color: var(--gold); background: transparent; }
          .prov-sidefoot { display: none; }
          .prov-chain { grid-template-columns: 1fr; }
          .prov-node { transform: rotate(90deg); width: 120px; margin: 0 auto; }
        }
      `}</style>
  );
}
