"use client";

import { useState } from "react";
import Changeovers from "./Changeovers";
import Compliance from "./Compliance";
import Contractors from "./Contractors";
import Linen from "./Linen";
import Portfolio from "./Portfolio";
import Rota from "./Rota";
import Statements from "./Statements";
import Today, { type SectionId } from "./Today";

// ─────────────────────────────────────────────────────────────
// Tenure — property management demo for holiday lets and second homes.
//
// One tab per spreadsheet the office currently keeps. All static data,
// no API calls. Everything is scoped under .tn so nothing leaks into the
// site's stylesheet and nothing on the site can reach in.
// ─────────────────────────────────────────────────────────────

const SECTIONS: { id: SectionId; label: string; note: string }[] = [
  { id: "today", label: "Today", note: "What needs a person" },
  { id: "changeovers", label: "Changeovers", note: "Arrivals and departures" },
  { id: "rota", label: "Rota", note: "Who is cleaning what" },
  { id: "linen", label: "Linen & stock", note: "Laundry and ordering" },
  { id: "compliance", label: "Compliance", note: "Certificates and dates" },
  { id: "statements", label: "Owner statements", note: "The monthly run" },
  { id: "contractors", label: "Contractors", note: "Trades and paperwork" },
  { id: "portfolio", label: "Portfolio", note: "Properties and owners" },
];

export default function TenureApp() {
  const [section, setSection] = useState<SectionId>("today");

  return (
    <div className="tn">
      <style>{CSS}</style>

      <header className="tn-top">
        <div className="tn-brand">
          <span className="tn-mark">Tenure</span>
          <span className="tn-client">
            Harbourside Property · Salcombe &amp; Downderry
          </span>
        </div>
        <div className="tn-who">
          <span className="tn-avatar" aria-hidden>
            NT
          </span>
          <span>Nia Trelawny · Property manager</span>
        </div>
      </header>

      <div className="tn-body">
        <nav className="tn-side" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`tn-navitem${section === s.id ? " is-on" : ""}`}
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
            >
              <span className="tn-navlabel">{s.label}</span>
              <span className="tn-navnote">{s.note}</span>
            </button>
          ))}
        </nav>

        <main className="tn-main">
          {section === "today" && <Today onJump={setSection} />}
          {section === "changeovers" && <Changeovers />}
          {section === "rota" && <Rota />}
          {section === "linen" && <Linen />}
          {section === "compliance" && <Compliance />}
          {section === "statements" && <Statements />}
          {section === "contractors" && <Contractors />}
          {section === "portfolio" && <Portfolio />}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.tn {
  --tn-ink: #23262a;
  --tn-mute: #6d6759;
  --tn-line: rgba(35, 38, 42, 0.13);
  --tn-panel: rgba(35, 38, 42, 0.025);
  --tn-accent: #2f5d62;
  --tn-alert: #a8412a;
  --tn-warn: #8d6a1c;
  --tn-clear: #4a6b52;

  min-height: 100vh;
  background: var(--bg, #f7f5f0);
  color: var(--tn-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.55;
}
.tn *, .tn *::before, .tn *::after { box-sizing: border-box; }

.tn-top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  padding: 18px 28px; border-bottom: 1px solid var(--tn-line);
}
.tn-brand { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.tn-mark {
  font-family: "Newsreader", Georgia, serif;
  font-style: italic; font-weight: 600; font-size: 25px; letter-spacing: -0.01em;
}
.tn-client { font-size: 13px; color: var(--tn-mute); }
.tn-who { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--tn-mute); }
.tn-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--tn-accent); color: #fff;
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
}

.tn-body { display: grid; grid-template-columns: 224px minmax(0, 1fr); }

.tn-side {
  border-right: 1px solid var(--tn-line);
  padding: 20px 12px; display: flex; flex-direction: column; gap: 2px;
  min-height: calc(100vh - 68px);
}
.tn-navitem {
  display: flex; flex-direction: column; gap: 1px;
  text-align: left; width: 100%;
  padding: 9px 12px; border: 0; border-radius: 5px;
  background: transparent; color: var(--tn-ink); font: inherit; cursor: pointer;
}
.tn-navitem:hover { background: var(--tn-panel); }
.tn-navitem.is-on { background: rgba(47, 93, 98, 0.09); }
.tn-navitem.is-on .tn-navlabel { color: var(--tn-accent); }
.tn-navlabel { font-size: 14.5px; font-weight: 550; }
.tn-navnote { font-size: 12px; color: var(--tn-mute); }
.tn-navitem:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 1px; }

.tn-main { padding: 30px 34px 80px; max-width: 1180px; }

.tn-head {
  margin-bottom: 20px; display: flex; justify-content: space-between;
  align-items: flex-end; gap: 20px; flex-wrap: wrap;
}
.tn-head h2 {
  font-family: "Newsreader", Georgia, serif;
  font-style: italic; font-weight: 600; font-size: 34px; line-height: 1.1;
  margin: 0 0 8px;
}
.tn-head p { margin: 0; color: var(--tn-mute); max-width: 62ch; }
.tn-subhead {
  font-family: "Newsreader", Georgia, serif; font-style: italic;
  font-weight: 600; font-size: 22px; margin: 34px 0 12px;
}

.tn-prov {
  margin: 0 0 24px; padding: 11px 14px;
  border-left: 2px solid var(--tn-accent); background: var(--tn-panel);
  font-size: 13.5px; color: var(--tn-mute); max-width: 74ch;
}

.tn-figures {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 1px; background: var(--tn-line);
  border: 1px solid var(--tn-line); border-radius: 6px; overflow: hidden;
  margin-bottom: 26px;
}
.tn-fig { background: var(--bg, #f7f5f0); padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
.tn-fig-value { font-size: 21px; font-weight: 600; letter-spacing: -0.015em; }
.tn-fig-label { font-size: 12px; color: var(--tn-mute); }
.tn-fig-alert .tn-fig-value { color: var(--tn-alert); }
.tn-fig-warn .tn-fig-value { color: var(--tn-warn); }

.tn-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 1px;
  background: var(--tn-line); border: 1px solid var(--tn-line);
  border-radius: 6px; overflow: hidden;
}
.tn-list > li { background: var(--bg, #f7f5f0); }

.tn-exc { padding: 16px 20px; border-left: 3px solid transparent; }
.tn-exc-body h4 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
.tn-exc-body p { margin: 0 0 9px; max-width: 74ch; }

.tn-u-overdue { border-left-color: var(--tn-alert); }
.tn-u-soon { border-left-color: var(--tn-warn); }
.tn-u-overdue .tn-cert-rel { color: var(--tn-alert); }
.tn-u-soon .tn-cert-rel { color: var(--tn-warn); }

.tn-flag { padding: 12px 20px; display: flex; flex-direction: column; gap: 1px; border-left: 3px solid transparent; }
.tn-flag > span:last-child { font-size: 13.5px; color: var(--tn-mute); }

.tn-inline {
  border: 0; background: transparent; padding: 0; font: inherit;
  font-size: 13.5px; color: var(--tn-accent); cursor: pointer;
  text-decoration: underline; text-underline-offset: 3px;
}
.tn-inline:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 2px; }

.tn-tablewrap { border: 1px solid var(--tn-line); border-radius: 6px; overflow-x: auto; }
.tn-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.tn-table th, .tn-table td { text-align: left; padding: 11px 14px; vertical-align: top; }
.tn-table thead th {
  font-size: 12px; font-weight: 600; color: var(--tn-mute);
  border-bottom: 1px solid var(--tn-line); white-space: nowrap;
}
.tn-table tbody tr + tr th, .tn-table tbody tr + tr td { border-top: 1px solid var(--tn-line); }
.tn-table tbody th { font-weight: 400; }
.tn-strong { display: block; font-weight: 600; }
.tn-sub { display: block; font-size: 12.5px; color: var(--tn-mute); font-weight: 400; }
.tn-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tn-meta { margin: 0; font-size: 13px; color: var(--tn-mute); }
.tn-alerttext { color: var(--tn-alert); }
.tn-empty { color: var(--tn-mute); font-size: 14px; padding: 16px 0; }
.tn-totalrow th, .tn-totalrow td { font-weight: 600; background: var(--tn-panel); }
.tn-rowalert th, .tn-rowalert td { background: rgba(168, 65, 42, 0.05); }

.tn-clickrow { cursor: pointer; }
.tn-clickrow:hover th, .tn-clickrow:hover td { background: var(--tn-panel); }
.tn-clickrow.is-open th, .tn-clickrow.is-open td { background: rgba(47, 93, 98, 0.07); }

.tn-tag {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  background: var(--tn-panel); border: 1px solid var(--tn-line);
  font-size: 12px; white-space: nowrap;
}
.tn-tag-alert, .tn-u-tag-overdue { color: var(--tn-alert); border-color: rgba(168, 65, 42, 0.35); }
.tn-tag-warn, .tn-u-tag-soon { color: var(--tn-warn); border-color: rgba(141, 106, 28, 0.35); }
.tn-tag-clear, .tn-u-tag-clear { color: var(--tn-clear); border-color: rgba(74, 107, 82, 0.3); }
.tn-tag-quiet { color: var(--tn-mute); }
.tn-status-draft { color: var(--tn-warn); border-color: rgba(141, 106, 28, 0.35); }
.tn-status-approved, .tn-status-sent { color: var(--tn-clear); border-color: rgba(74, 107, 82, 0.3); }
.tn-kind-turnaround { color: var(--tn-alert); border-color: rgba(168, 65, 42, 0.35); }
.tn-kind-out { color: var(--tn-warn); border-color: rgba(141, 106, 28, 0.35); }

/* ── week grids ── */
.tn-grid tbody td { text-align: center; font-size: 12.5px; }
.tn-grid tbody th { min-width: 150px; }
.tn-gridhead button {
  border: 0; background: transparent; font: inherit; color: inherit;
  cursor: pointer; padding: 0; display: flex; flex-direction: column;
  align-items: center; gap: 1px; width: 100%;
}
.tn-gridhead.is-on { color: var(--tn-accent); }
.tn-gridhead.is-on button { font-weight: 700; }
.tn-cell { min-width: 84px; }
.tn-c-turn { background: rgba(168, 65, 42, 0.09); color: var(--tn-alert); font-weight: 600; }
.tn-c-out { background: rgba(141, 106, 28, 0.09); color: var(--tn-warn); }
.tn-c-in { background: rgba(47, 93, 98, 0.09); color: var(--tn-accent); }
.tn-c-stay { background: var(--tn-panel); }
.tn-c-away { background: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(35,38,42,0.05) 5px, rgba(35,38,42,0.05) 10px); }
.tn-c-clash { background: rgba(168, 65, 42, 0.12); }
.tn-cellhours { display: block; font-weight: 600; }
.tn-total { font-weight: 600; }
.tn-total-warn { color: var(--tn-warn); }
.tn-total-under { color: var(--tn-mute); }

.tn-daybreak { margin-top: 30px; }
.tn-daybreak h3 {
  font-family: "Newsreader", Georgia, serif; font-style: italic;
  font-weight: 600; font-size: 24px; margin: 0 0 14px;
}
.tn-daypick { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 22px; }
.tn-daybtn {
  border: 1px solid var(--tn-line); border-radius: 5px; background: transparent;
  font: inherit; font-size: 13px; padding: 7px 12px; cursor: pointer;
  color: var(--tn-ink); display: flex; flex-direction: column; align-items: center;
}
.tn-daybtn.is-on { border-color: var(--tn-accent); color: var(--tn-accent); background: rgba(47, 93, 98, 0.07); }

.tn-move {
  display: grid; grid-template-columns: 118px minmax(0, 1fr) 190px;
  gap: 16px; padding: 15px 20px; border-left: 3px solid transparent;
}
.tn-move-body h4 { margin: 0 0 2px; font-size: 15.5px; font-weight: 600; }
.tn-move-body .tn-sub { margin-bottom: 5px; }
.tn-move-assign { display: flex; flex-direction: column; gap: 1px; font-size: 13.5px; }

.tn-cert {
  display: grid; grid-template-columns: 132px minmax(0, 1fr) auto;
  gap: 18px; align-items: start; padding: 14px 20px;
  border-left: 3px solid transparent;
}
.tn-cert-rail { display: flex; flex-direction: column; gap: 2px; }
.tn-cert-date { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12.5px; }
.tn-cert-rel { font-size: 12px; color: var(--tn-mute); }
.tn-cert-body h4 { margin: 0 0 3px; font-size: 15.5px; font-weight: 600; }

.tn-statement { margin-top: 26px; }
.tn-statement h3 {
  font-family: "Newsreader", Georgia, serif; font-style: italic;
  font-weight: 600; font-size: 23px; margin: 0 0 4px;
}
.tn-statement .tn-meta { margin-bottom: 14px; }

@media (max-width: 1000px) {
  .tn-body { grid-template-columns: 1fr; }
  .tn-side {
    flex-direction: row; overflow-x: auto; min-height: 0;
    border-right: 0; border-bottom: 1px solid var(--tn-line);
    padding: 10px 14px; gap: 4px;
  }
  .tn-navitem { width: auto; white-space: nowrap; }
  .tn-navnote { display: none; }
  .tn-main { padding: 24px 18px 60px; }
  .tn-head h2 { font-size: 27px; }
  .tn-move, .tn-cert { grid-template-columns: 1fr; gap: 8px; }
  .tn-cert-rail { flex-direction: row; gap: 10px; align-items: baseline; }
  .tn-move-assign { padding-top: 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .tn *, .tn *::before, .tn *::after { transition: none !important; animation: none !important; }
}
`;
