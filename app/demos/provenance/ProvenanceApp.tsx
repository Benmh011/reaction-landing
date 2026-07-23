"use client";

import { useState } from "react";
import {
  DOCUMENTS,
  TRAINING,
  TRACE,
  PRODUCTION_LOG,
  COLD_CHAIN,
  type Status,
} from "./data";
import QuestionnaireDesk from "./QuestionnaireDesk";

// ————————————————————————————————————————————————————————————————
// Provenance — demonstration build.
// One client component, all sample data, no persistence. The visual
// language is the Reaction house system (paper, hairlines, captain
// colours, mono for anything that is a record) tightened into a tool.
// ————————————————————————————————————————————————————————————————

// ————— Salcombe palette: estuary teal, seafoam, cream, cacao, raspberry —————
const GREEN = "#167a5b"; // sea green — in date / passing
const BRASS = "#a3772a"; // honey — due soon
const VERM = "#c22f4e"; // raspberry ripple — overdue / alerts
const BLUE = "#2c6e8a"; // harbour — informational
const MUTED = "#77705f";

const DEEP = "#0d3f47"; // dark estuary — sidebar
const TEAL = "#0e5560"; // primary actions
const FOAM = "#d8ebdf"; // seafoam — highlights on dark
const MINT = "#63b89a"; // active markers on dark
const DARK_MUTED = "#8fb0ab"; // muted text on dark estuary

const STATUS_COLOR: Record<Status, string> = { ok: GREEN, due: BRASS, overdue: VERM };
const STATUS_WORD: Record<Status, string> = { ok: "In date", due: "Due soon", overdue: "Overdue" };

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const serifItal: React.CSSProperties = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontStyle: "italic",
  fontWeight: 600,
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

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header style={{ marginBottom: 22 }}>
      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.18em", color: MUTED, marginBottom: 6 }}>
        {kicker.toUpperCase()}
      </p>
      <h2 style={{ ...serifItal, fontSize: 30, lineHeight: 1.05, marginBottom: sub ? 6 : 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 14, color: MUTED, maxWidth: 560 }}>{sub}</p>}
    </header>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  ...mono,
  letterSpacing: "0.1em",
  color: MUTED,
  padding: "0 12px 10px 0",
  borderBottom: "1px solid var(--rule)",
  fontWeight: 500,
};
const td: React.CSSProperties = {
  fontSize: 13.5,
  padding: "11px 12px 11px 0",
  borderBottom: "1px solid var(--rule)",
  verticalAlign: "top",
};

// ————————————————————————— sections —————————————————————————

function Overview() {
  const exceptions = [
    { color: VERM, text: "Glass & Brittle Plastic Register review is overdue — due 19 May 2026.", goto: "Documents" },
    { color: VERM, text: "Strete Gate shop freezer above −15°C for 22 minutes. Alert sent 12:04.", goto: "Cold chain" },
    { color: VERM, text: "S. Trent's Allergen Awareness certificate expired 28 Jun 2026.", goto: "Documents" },
    { color: BRASS, text: "Cocoa supplier declaration falls due 30 Aug 2026.", goto: "Documents" },
    { color: BRASS, text: "Harbourline questionnaire drafted — 3 answers held for review.", goto: "Questionnaires" },
  ];
  return (
    <>
      <SectionTitle
        kicker="Estuary Creamery · Wed 22 Jul 2026"
        title="This morning's picture"
        sub="Everything that needs a decision, drawn from every register in the practice. Quiet lines are working lines."
      />
      <div style={{ display: "grid", gap: 10 }}>
        {exceptions.map((e, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "3px 1fr auto",
              gap: 14,
              alignItems: "center",
              background: "var(--bg-elevated)",
              border: "1px solid var(--rule)",
              borderRadius: 12,
              padding: "13px 16px",
            }}
          >
            <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: e.color }} />
            <span style={{ fontSize: 14 }}>{e.text}</span>
            <span style={{ ...mono, fontSize: 11, color: MUTED }}>{e.goto} →</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: MUTED, marginTop: 18 }}>
        6 production records captured today · last CCP check passed 11:47 · next audit window opens Mar 2027.
      </p>
    </>
  );
}

function Questionnaires() {
  return (
    <>
      <SectionTitle
        kicker="Trade due diligence"
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
        kicker="Quality management system"
        title="Documents & audit readiness"
        sub="The controlled register the questionnaire answers draw from. Anything drifting out of date surfaces here long before an auditor finds it."
      />
      <div style={{ overflowX: "auto", marginBottom: 30 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr>
              <th style={th}>DOCUMENT</th>
              <th style={th}>REF</th>
              <th style={th}>VER</th>
              <th style={th}>LAST REVIEW</th>
              <th style={th}>NEXT</th>
              <th style={th}>STATE</th>
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

      <p style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: MUTED, marginBottom: 12 }}>
        TRAINING CERTIFICATES
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={th}>PERSON</th>
              <th style={th}>ROLE</th>
              <th style={th}>CERTIFICATE</th>
              <th style={th}>EXPIRES</th>
              <th style={th}>STATE</th>
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

function Traceability() {
  return (
    <>
      <SectionTitle
        kicker="One step back · one step forward"
        title="Trace a batch"
        sub="Pick any batch and see every input lot behind it and every customer ahead of it. A mock recall becomes an hour's work, not a weekend."
      />
      <Card pad={24}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "baseline", marginBottom: 24 }}>
          <span style={{ ...mono, fontSize: 20, fontWeight: 500 }}>{TRACE.batch}</span>
          <span style={{ fontSize: 14.5 }}>{TRACE.product}</span>
          <span style={{ ...mono, fontSize: 12, color: MUTED }}>
            made {TRACE.made} · {TRACE.quantity}
          </span>
        </div>

        {/* the chain — inputs flow in from the left, dispatches out to the right */}
        <div className="prov-chain">
          <div>
            <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
              ← INPUT LOTS
            </p>
            {TRACE.inputs.map((i) => (
              <div key={i.lot} style={{ padding: "9px 0", borderTop: "1px solid var(--rule)" }}>
                <p style={{ fontSize: 13.5 }}>{i.material}</p>
                <p style={{ ...mono, fontSize: 11.5, color: MUTED }}>
                  {i.lot} · {i.supplier}
                </p>
              </div>
            ))}
          </div>

          <div className="prov-node" aria-hidden>
            <span className="prov-line" />
            <span className="prov-station">
              <span style={{ ...mono, fontSize: 11, color: "var(--bg)" }}>BATCH</span>
            </span>
            <span className="prov-line" />
          </div>

          <div>
            <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.16em", color: MUTED, marginBottom: 10 }}>
              DISPATCHED TO →
            </p>
            {TRACE.dispatched.map((d) => (
              <div key={d.to} style={{ padding: "9px 0", borderTop: "1px solid var(--rule)" }}>
                <p style={{ fontSize: 13.5 }}>{d.to}</p>
                <p style={{ ...mono, fontSize: 11.5, color: MUTED }}>
                  {d.date} · {d.units} units
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>
            Run mock recall
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px" }}>
            Export trace pack
          </button>
        </div>
      </Card>
    </>
  );
}

function ProductionLog() {
  const kindColor: Record<string, string> = { ccp: VERM, batch: BLUE, clean: BRASS, check: GREEN };
  return (
    <>
      <SectionTitle
        kicker="The factory floor, hands free"
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
              <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                {r.who} · {r.via === "voice" ? "voice capture" : "instrument feed"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ColdChain() {
  return (
    <>
      <SectionTitle
        kicker="Factory to freezer"
        title="Cold chain"
        sub="Every van, coldstore and shop freezer on one line. Excursions raise an alert while there's still time to save the stock — and the log doubles as your due-diligence defence."
      />
      <div style={{ display: "grid", gap: 10 }}>
        {COLD_CHAIN.map((c) => (
          <div
            key={c.asset}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "center",
              background: "var(--bg-elevated)",
              border: "1px solid var(--rule)",
              borderRadius: 12,
              padding: "14px 18px",
            }}
          >
            <div>
              <p style={{ fontSize: 14.5, marginBottom: 2 }}>
                <Dot status={c.state} />
                {c.asset}
              </p>
              <p style={{ fontSize: 12.5, color: c.state === "overdue" ? VERM : MUTED, paddingLeft: 16 }}>{c.note}</p>
            </div>
            <span
              style={{
                ...mono,
                fontSize: 19,
                fontWeight: 500,
                color: STATUS_COLOR[c.state],
              }}
            >
              {c.now}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ————————————————————————— welcome —————————————————————————

/**
 * The welcome page: a Salcombe estuary at golden hour, drawn flat.
 * A honey sun on the waterline, six bands of water from foam mist to
 * deep estuary, the wordmark above, and one action — sign in.
 * The two middle bands drift a few pixels on a slow tide unless the
 * visitor prefers reduced motion.
 */

const SEA_BANDS = [
  { base: 210, amp: 12, color: "#dfeee3" },
  { base: 258, amp: 16, color: "#bcdccb", drift: "pv-drift-a" },
  { base: 308, amp: 14, color: "#8fc3ae" },
  { base: 360, amp: 18, color: "#4f9d8b", drift: "pv-drift-b" },
  { base: 414, amp: 12, color: "#1f6b68" },
  { base: 462, amp: 8, color: "#0d3f47" },
];

const wavePath = (base: number, amp: number) => {
  // a gentle swell across an over-wide canvas so drift never shows an edge
  const W = 1680;
  const seg = 210;
  let d = `M -120 ${base}`;
  for (let x = -120; x < W; x += seg) {
    d += ` C ${x + seg * 0.33} ${base - amp}, ${x + seg * 0.66} ${base + amp}, ${x + seg} ${base}`;
  }
  d += ` L ${W} 560 L -120 560 Z`;
  return d;
};

function EstuarySea() {
  return (
    <svg
      className="pv-sea"
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {/* the sun, sitting on the waterline */}
      <circle cx="1020" cy="168" r="64" fill="#e9be7a" />
      <circle cx="1020" cy="168" r="82" fill="none" stroke="#e9be7a" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="1020" cy="168" r="102" fill="none" stroke="#e9be7a" strokeOpacity="0.15" strokeWidth="1.5" />
      {SEA_BANDS.map((b) => (
        <path key={b.base} className={b.drift} d={wavePath(b.base, b.amp)} fill={b.color} />
      ))}
    </svg>
  );
}

function StartPage({ onEnter }: { onEnter: (s: SectionId) => void }) {
  return (
    <main className="pv-welcome">
      <div className="pv-welcome-inner">
        <p style={{ ...mono, fontSize: 11, letterSpacing: "0.26em", color: TEAL, marginBottom: 14 }}>
          REACTION
        </p>
        <h1 className="pv-wordmark" style={serifItal}>
          Provenance
        </h1>
        <p className="pv-welcome-line">
          The ledger for everything Estuary Creamery signs its name to.
        </p>
        <button className="btn btn-primary pv-signin" onClick={() => onEnter("overview")}>
          Sign in
        </button>
      </div>
      <EstuarySea />
      <p className="pv-welcome-foot">DEMONSTRATION ENVIRONMENT · ALL DATA IS SAMPLE DATA</p>
    </main>
  );
}

// ————————————————————————— shell —————————————————————————

const SECTIONS = [
  { id: "overview", label: "Overview", flag: 3 },
  { id: "questionnaires", label: "Questionnaires", flag: 1 },
  { id: "documents", label: "Documents & audit", flag: 3 },
  { id: "trace", label: "Traceability", flag: 0 },
  { id: "production", label: "Production records", flag: 0 },
  { id: "coldchain", label: "Cold chain", flag: 1 },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function ProvenanceApp() {
  const [view, setView] = useState<"start" | SectionId>("start");

  if (view === "start") {
    return (
      <div className="pv-root">
        <StartPage onEnter={setView} />
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
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
              marginBottom: 30,
            }}
            aria-label="Back to start"
          >
            <p style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: DARK_MUTED, marginBottom: 4 }}>
              REACTION
            </p>
            <p style={{ ...serifItal, fontSize: 27, lineHeight: 1, color: "#f2efe4" }}>Provenance</p>
          </button>

          <nav aria-label="Sections" style={{ display: "grid", gap: 2 }}>
            {SECTIONS.map((s) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  onClick={() => setView(s.id)}
                  className="prov-navitem"
                  aria-current={on ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    fontSize: 14,
                    fontWeight: on ? 600 : 400,
                    color: on ? FOAM : DARK_MUTED,
                    background: on ? "rgba(255,255,255,0.07)" : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${on ? MINT : "transparent"}`,
                    borderRadius: "0 9px 9px 0",
                    padding: "9px 12px 9px 14px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {s.flag > 0 && <span className="pv-flag">{s.flag}</span>}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", paddingTop: 26 }}>
            <p style={{ fontSize: 11.5, color: DARK_MUTED, lineHeight: 1.5 }}>
              Demonstration environment.
              <br />
              All data is sample data.
            </p>
            <a href="/demo" style={{ fontSize: 12, color: FOAM }}>
              Book a walkthrough →
            </a>
          </div>
        </aside>

        <main className="prov-main">
          {active === "overview" && <Overview />}
          {active === "questionnaires" && <Questionnaires />}
          {active === "documents" && <Documents />}
          {active === "trace" && <Traceability />}
          {active === "production" && <ProductionLog />}
          {active === "coldchain" && <ColdChain />}
        </main>
      </div>
      <ThemeStyles />
    </div>
  );
}

function ThemeStyles() {
  return (
    <style>{`
        /* Salcombe theme, scoped — the rest of the site keeps its own palette */
        .pv-root {
          --bg:           #f6f2e7;
          --bg-surface:   #ebe5d3;
          --bg-elevated:  #fdfaf1;
          --text:         #251d15;
          --text-soft:    #4d4437;
          --text-muted:   #77705f;
          --rule:         #e2dbc6;
          --rule-strong:  #c9c0a6;
          --accent:       ${TEAL};
          background: var(--bg);
          color: var(--text-soft);
          min-height: 100vh;
        }
        .pv-root .btn-primary { background: ${TEAL}; color: #f2efe4; }
        .pv-root .btn-primary:hover:not(:disabled) { background: ${DEEP}; }
        .pv-root .btn-ghost { color: ${TEAL}; }
        .pv-flag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          min-width: 18px;
          text-align: center;
          padding: 2px 5px;
          border-radius: 99px;
          color: #fdfaf1;
          background: ${VERM};
          display: inline-block;
          line-height: 1.4;
        }

        /* welcome */
        .pv-welcome {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .pv-welcome-inner {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: clamp(64px, 14vh, 150px) 24px 0;
        }
        .pv-wordmark {
          font-size: clamp(56px, 9vw, 108px);
          line-height: 0.98;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .pv-welcome-line {
          font-size: 15.5px;
          color: var(--text-soft);
          margin-top: 16px;
        }
        .pv-signin {
          margin-top: 30px;
          padding: 13px 44px;
          font-size: 15px;
        }
        .pv-sea {
          position: absolute;
          inset: auto 0 0 0;
          width: 100%;
          height: clamp(260px, 46vh, 480px);
          display: block;
          z-index: 1;
        }
        .pv-welcome-foot {
          position: absolute;
          bottom: 18px;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 2;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          color: #cfe4d6;
        }
        @media (prefers-reduced-motion: no-preference) {
          .pv-drift-a { animation: pvdrift 16s ease-in-out infinite alternate; }
          .pv-drift-b { animation: pvdrift 22s ease-in-out infinite alternate-reverse; }
        }
        @keyframes pvdrift {
          from { transform: translateX(-26px); }
          to { transform: translateX(26px); }
        }

        .prov-shell {
          display: grid;
          grid-template-columns: 232px 1fr;
          min-height: 100vh;
          background: var(--bg);
        }
        .prov-side {
          display: flex;
          flex-direction: column;
          padding: 26px 14px 26px 20px;
          background: #0d3f47;
          border-right: 1px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .prov-main {
          padding: 34px clamp(20px, 4.5vw, 56px) 64px;
          max-width: 980px;
        }
        .prov-navitem:focus-visible {
          outline: 2px solid ${MINT};
          outline-offset: 2px;
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
          background: var(--text, #1a1713);
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
            border-right: none;
            border-bottom: 1px solid var(--rule);
            padding: 14px 16px;
          }
          .prov-side > div:first-child { margin-bottom: 0; flex-shrink: 0; }
          .prov-side nav { display: flex; gap: 4px; }
          .prov-side .prov-navitem { white-space: nowrap; border-left: none; border-bottom: 2px solid transparent; border-radius: 8px; }
          .prov-side .prov-navitem[aria-current="page"] { border-bottom-color: ${MINT}; }
          .prov-side > div:last-child { display: none; }
          .prov-chain { grid-template-columns: 1fr; }
          .prov-node { transform: rotate(90deg); width: 120px; margin: 0 auto; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .prov-main > * { animation: provfade 220ms ease-out; }
        }
        @keyframes provfade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
  );
}
