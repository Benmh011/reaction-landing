"use client";

import { useState } from "react";
import {
  certificates,
  exceptions,
  formatDate,
  jobs,
  money,
  portfolioSummary,
  properties,
  propertyLabel,
  relativeDays,
  tenancies,
  tenancyForProperty,
  urgencyOf,
  type Urgency,
} from "./data";

// ─────────────────────────────────────────────────────────────
// Tenure — property management demo.
//
// Bare-bones shell: five sections over static sample data for a
// fictional South Devon managing agent. No database, no API calls.
// Everything is scoped under .tn so nothing leaks into the site's own
// stylesheet, and nothing on the site can reach in.
// ─────────────────────────────────────────────────────────────

type SectionId =
  | "overview"
  | "properties"
  | "tenancies"
  | "maintenance"
  | "compliance";

const SECTIONS: { id: SectionId; label: string; note: string }[] = [
  { id: "overview", label: "Today", note: "What needs a person" },
  { id: "properties", label: "Properties", note: "The managed portfolio" },
  { id: "tenancies", label: "Tenancies", note: "Terms, rent, deposits" },
  { id: "maintenance", label: "Maintenance", note: "Open jobs" },
  { id: "compliance", label: "Compliance", note: "Certificates and dates" },
];

export default function TenureApp() {
  const [section, setSection] = useState<SectionId>("overview");

  return (
    <div className="tn">
      <style>{CSS}</style>

      <header className="tn-top">
        <div className="tn-brand">
          <span className="tn-mark">Tenure</span>
          <span className="tn-client">Harbourside Property · Dartmouth</span>
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
          {section === "overview" && <Overview onJump={setSection} />}
          {section === "properties" && <Properties />}
          {section === "tenancies" && <Tenancies />}
          {section === "maintenance" && <Maintenance />}
          {section === "compliance" && <Compliance />}
        </main>
      </div>
    </div>
  );
}

// ─────────────── OVERVIEW ───────────────

function Overview({ onJump }: { onJump: (s: SectionId) => void }) {
  const overdue = exceptions.filter((e) => e.urgency === "overdue").length;

  return (
    <>
      <PageHead
        title="Tuesday, 1 September"
        lede={
          overdue === 1
            ? "One thing is past its date. The rest is this week's work, in the order it falls due."
            : `${overdue} things are past their date. The rest is this week's work, in the order it falls due.`
        }
      />

      <div className="tn-figures">
        <Figure label="Managed" value={String(portfolioSummary.managed)} />
        <Figure label="Let" value={String(portfolioSummary.occupied)} />
        <Figure label="Vacant" value={String(portfolioSummary.vacant)} />
        <Figure
          label="Rent monthly"
          value={money(portfolioSummary.monthlyRent)}
        />
        <Figure
          label="Arrears"
          value={money(portfolioSummary.arrears)}
          tone={portfolioSummary.arrears > 0 ? "alert" : undefined}
        />
        <Figure label="Open jobs" value={String(portfolioSummary.openJobs)} />
      </div>

      <ul className="tn-list">
        {exceptions.map((e) => (
          <li key={e.id} className={`tn-exc tn-u-${e.urgency}`}>
            <div className="tn-exc-rail">
              <span className="tn-exc-date">{formatDate(e.date)}</span>
              <span className="tn-exc-rel">{relativeDays(e.date)}</span>
            </div>
            <div className="tn-exc-body">
              <h3>{e.headline}</h3>
              <p className="tn-exc-where">{propertyLabel(e.propertyId)}</p>
              <p>{e.detail}</p>
              <button
                type="button"
                className="tn-inline"
                onClick={() => onJump(e.section)}
              >
                Open in {SECTIONS.find((s) => s.id === e.section)?.label}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ─────────────── PROPERTIES ───────────────

function Properties() {
  return (
    <>
      <PageHead
        title="Properties"
        lede="Nine addresses under management, grouped by the town they sit in."
      />
      <div className="tn-tablewrap">
        <table className="tn-table">
          <thead>
            <tr>
              <th scope="col">Address</th>
              <th scope="col">Type</th>
              <th scope="col">Let as</th>
              <th scope="col">Landlord</th>
              <th scope="col">Manager</th>
              <th scope="col">Rent</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => {
              const t = tenancyForProperty(p.id);
              return (
                <tr key={p.id}>
                  <th scope="row">
                    <span className="tn-strong">{p.address}</span>
                    <span className="tn-sub">
                      {p.town} · {p.postcode}
                    </span>
                  </th>
                  <td>
                    {p.type} · {p.beds} bed
                  </td>
                  <td>
                    <span
                      className={`tn-tag${
                        p.tenure === "Vacant" ? " tn-tag-warn" : ""
                      }`}
                    >
                      {p.tenure}
                    </span>
                  </td>
                  <td>{p.landlord}</td>
                  <td>{p.manager}</td>
                  <td className="tn-num">{t ? money(t.rent) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─────────────── TENANCIES ───────────────

function Tenancies() {
  return (
    <>
      <PageHead
        title="Tenancies"
        lede="Seven live agreements. Sorted by the date each one next needs a decision."
      />
      <ul className="tn-cards">
        {tenancies.map((t) => {
          const u = urgencyOf(t.end, 45);
          return (
            <li key={t.id} className={`tn-card tn-u-${u}`}>
              <div className="tn-card-head">
                <div>
                  <h3>{propertyLabel(t.propertyId)}</h3>
                  <p className="tn-sub">{t.tenant}</p>
                </div>
                <span className={`tn-tag tn-status-${t.status.split(" ")[0].toLowerCase()}`}>
                  {t.status}
                </span>
              </div>
              <dl className="tn-facts">
                <div>
                  <dt>Term ends</dt>
                  <dd>
                    {formatDate(t.end)}{" "}
                    <span className="tn-rel">{relativeDays(t.end)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Rent</dt>
                  <dd>
                    {money(t.rent)} on the {ordinal(t.rentDay)}
                  </dd>
                </div>
                <div>
                  <dt>Arrears</dt>
                  <dd className={t.arrears > 0 ? "tn-alerttext" : undefined}>
                    {t.arrears > 0 ? money(t.arrears) : "None"}
                  </dd>
                </div>
                <div>
                  <dt>Deposit</dt>
                  <dd>
                    {t.depositScheme}, protected {formatDate(t.depositProtectedOn)}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ─────────────── MAINTENANCE ───────────────

function Maintenance() {
  return (
    <>
      <PageHead
        title="Maintenance"
        lede="Six jobs open across the portfolio. Emergencies first, then by how long they have been waiting."
      />
      <ul className="tn-list">
        {jobs.map((j) => (
          <li
            key={j.id}
            className={`tn-job tn-p-${j.priority.toLowerCase()}`}
          >
            <div className="tn-job-rail">
              <span className="tn-ref">{j.ref}</span>
              <span className={`tn-tag tn-pri-${j.priority.toLowerCase()}`}>
                {j.priority}
              </span>
            </div>
            <div className="tn-job-body">
              <h3>{j.summary}</h3>
              <p className="tn-sub">{propertyLabel(j.propertyId)}</p>
              <p className="tn-meta">
                Raised {formatDate(j.raised)} by {j.reportedBy.toLowerCase()} ·{" "}
                {j.contractor ?? "No contractor assigned"}
                {j.scheduled
                  ? ` · attending ${formatDate(j.scheduled)}`
                  : " · not yet booked"}
              </p>
            </div>
            <span className="tn-job-status">{j.status}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ─────────────── COMPLIANCE ───────────────

function Compliance() {
  const rows = [...certificates].sort(
    (a, b) => a.expires.localeCompare(b.expires)
  );

  return (
    <>
      <PageHead
        title="Compliance"
        lede="Every dated obligation on the portfolio, earliest first. Two have already passed."
      />
      <ul className="tn-list">
        {rows.map((c) => {
          const u = urgencyOf(c.expires);
          return (
            <li key={c.id} className={`tn-cert tn-u-${u}`}>
              <div className="tn-cert-rail">
                <span className="tn-cert-date">{formatDate(c.expires)}</span>
                <span className="tn-cert-rel">{relativeDays(c.expires)}</span>
              </div>
              <div className="tn-cert-body">
                <h3>
                  {c.kind} — {propertyLabel(c.propertyId)}
                </h3>
                <p className="tn-meta">
                  Issued {formatDate(c.issued)} by {c.provider}
                </p>
                <p className="tn-basis">{c.basis}</p>
              </div>
              <span className={`tn-tag tn-u-tag-${u}`}>{stateWord(u)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ─────────────── SHARED BITS ───────────────

function PageHead({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="tn-head">
      <h2>{title}</h2>
      <p>{lede}</p>
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "alert";
}) {
  return (
    <div className={`tn-fig${tone ? ` tn-fig-${tone}` : ""}`}>
      <span className="tn-fig-value">{value}</span>
      <span className="tn-fig-label">{label}</span>
    </div>
  );
}

function stateWord(u: Urgency) {
  if (u === "overdue") return "Expired";
  if (u === "soon") return "Due";
  return "Valid";
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─────────────── STYLES ───────────────

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
  padding: 18px 28px;
  border-bottom: 1px solid var(--tn-line);
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

.tn-body { display: grid; grid-template-columns: 216px minmax(0, 1fr); }

.tn-side {
  border-right: 1px solid var(--tn-line);
  padding: 20px 12px; display: flex; flex-direction: column; gap: 2px;
  min-height: calc(100vh - 68px);
}
.tn-navitem {
  display: flex; flex-direction: column; gap: 1px;
  text-align: left; width: 100%;
  padding: 9px 12px; border: 0; border-radius: 5px;
  background: transparent; color: var(--tn-ink);
  font: inherit; cursor: pointer;
}
.tn-navitem:hover { background: var(--tn-panel); }
.tn-navitem.is-on { background: rgba(47, 93, 98, 0.09); }
.tn-navitem.is-on .tn-navlabel { color: var(--tn-accent); }
.tn-navlabel { font-size: 14.5px; font-weight: 550; }
.tn-navnote { font-size: 12px; color: var(--tn-mute); }
.tn-navitem:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 1px; }

.tn-main { padding: 30px 34px 72px; max-width: 1080px; }

.tn-head { margin-bottom: 26px; }
.tn-head h2 {
  font-family: "Newsreader", Georgia, serif;
  font-style: italic; font-weight: 600; font-size: 34px; line-height: 1.1;
  margin: 0 0 8px;
}
.tn-head p { margin: 0; color: var(--tn-mute); max-width: 62ch; }

.tn-figures {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(122px, 1fr));
  gap: 1px; background: var(--tn-line);
  border: 1px solid var(--tn-line); border-radius: 6px; overflow: hidden;
  margin-bottom: 30px;
}
.tn-fig {
  background: var(--bg, #f7f5f0);
  padding: 14px 16px; display: flex; flex-direction: column; gap: 2px;
}
.tn-fig-value { font-size: 21px; font-weight: 600; letter-spacing: -0.015em; }
.tn-fig-label { font-size: 12px; color: var(--tn-mute); }
.tn-fig-alert .tn-fig-value { color: var(--tn-alert); }

.tn-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; background: var(--tn-line); border: 1px solid var(--tn-line); border-radius: 6px; overflow: hidden; }
.tn-list > li { background: var(--bg, #f7f5f0); }

.tn-exc { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 18px; padding: 18px 20px; border-left: 3px solid transparent; }
.tn-exc-rail { display: flex; flex-direction: column; gap: 2px; }
.tn-exc-date { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12.5px; }
.tn-exc-rel { font-size: 12px; color: var(--tn-mute); }
.tn-exc-body h3 { margin: 0 0 3px; font-size: 16px; font-weight: 600; }
.tn-exc-where { margin: 0 0 7px; font-size: 13px; color: var(--tn-mute); }
.tn-exc-body p { margin: 0 0 10px; max-width: 68ch; }

.tn-u-overdue { border-left-color: var(--tn-alert); }
.tn-u-overdue .tn-exc-rel, .tn-u-overdue .tn-cert-rel { color: var(--tn-alert); }
.tn-u-soon { border-left-color: var(--tn-warn); }
.tn-u-soon .tn-exc-rel, .tn-u-soon .tn-cert-rel { color: var(--tn-warn); }
.tn-u-clear { border-left-color: transparent; }

.tn-inline {
  border: 0; background: transparent; padding: 0;
  font: inherit; font-size: 13.5px; color: var(--tn-accent);
  cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
}
.tn-inline:focus-visible { outline: 2px solid var(--tn-accent); outline-offset: 2px; }

.tn-tablewrap { border: 1px solid var(--tn-line); border-radius: 6px; overflow-x: auto; }
.tn-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.tn-table th, .tn-table td { text-align: left; padding: 12px 16px; vertical-align: top; }
.tn-table thead th {
  font-size: 12px; font-weight: 600; color: var(--tn-mute);
  border-bottom: 1px solid var(--tn-line); white-space: nowrap;
}
.tn-table tbody tr + tr th, .tn-table tbody tr + tr td { border-top: 1px solid var(--tn-line); }
.tn-table tbody th { font-weight: 400; }
.tn-strong { display: block; font-weight: 600; }
.tn-sub { display: block; font-size: 13px; color: var(--tn-mute); }
.tn-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

.tn-tag {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  background: var(--tn-panel); border: 1px solid var(--tn-line);
  font-size: 12px; white-space: nowrap;
}
.tn-tag-warn, .tn-u-tag-soon { color: var(--tn-warn); border-color: rgba(141, 106, 28, 0.35); }
.tn-u-tag-overdue { color: var(--tn-alert); border-color: rgba(168, 65, 42, 0.35); }
.tn-u-tag-clear { color: var(--tn-clear); border-color: rgba(74, 107, 82, 0.3); }
.tn-status-notice, .tn-status-ending { color: var(--tn-warn); border-color: rgba(141, 106, 28, 0.35); }
.tn-pri-emergency { color: var(--tn-alert); border-color: rgba(168, 65, 42, 0.35); }
.tn-pri-urgent { color: var(--tn-warn); border-color: rgba(141, 106, 28, 0.35); }

.tn-cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 14px; }
.tn-card { border: 1px solid var(--tn-line); border-left-width: 3px; border-radius: 6px; padding: 16px 18px; }
.tn-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.tn-card-head h3 { margin: 0; font-size: 15.5px; font-weight: 600; }
.tn-facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.tn-facts dt { font-size: 12px; color: var(--tn-mute); }
.tn-facts dd { margin: 0; font-size: 14px; }
.tn-rel { font-size: 12.5px; color: var(--tn-mute); }
.tn-alerttext { color: var(--tn-alert); font-weight: 600; }

.tn-job { display: grid; grid-template-columns: 126px minmax(0, 1fr) auto; gap: 18px; align-items: start; padding: 16px 20px; border-left: 3px solid transparent; }
.tn-job-rail { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.tn-ref { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12.5px; color: var(--tn-mute); }
.tn-job-body h3 { margin: 0 0 3px; font-size: 15.5px; font-weight: 600; }
.tn-job-body .tn-sub { margin-bottom: 5px; }
.tn-meta { margin: 0; font-size: 13px; color: var(--tn-mute); }
.tn-job-status { font-size: 13px; color: var(--tn-mute); white-space: nowrap; }
.tn-p-emergency { border-left-color: var(--tn-alert); }
.tn-p-urgent { border-left-color: var(--tn-warn); }

.tn-cert { display: grid; grid-template-columns: 132px minmax(0, 1fr) auto; gap: 18px; align-items: start; padding: 16px 20px; border-left: 3px solid transparent; }
.tn-cert-rail { display: flex; flex-direction: column; gap: 2px; }
.tn-cert-date { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12.5px; }
.tn-cert-rel { font-size: 12px; color: var(--tn-mute); }
.tn-cert-body h3 { margin: 0 0 3px; font-size: 15.5px; font-weight: 600; }
.tn-basis { margin: 5px 0 0; font-size: 13px; color: var(--tn-mute); max-width: 66ch; }

@media (max-width: 900px) {
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
  .tn-exc, .tn-cert, .tn-job { grid-template-columns: 1fr; gap: 8px; }
  .tn-exc-rail, .tn-cert-rail { flex-direction: row; gap: 10px; align-items: baseline; }
  .tn-job-rail { flex-direction: row; align-items: center; gap: 10px; }
  .tn-job-status { padding-top: 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .tn *, .tn *::before, .tn *::after { transition: none !important; animation: none !important; }
}
`;
