"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DOCUMENTS, TRAINING, PEOPLE, QUESTIONNAIRES, dateStatus, dueLabel, daysUntil, type Status } from "./data";
import ProductionDesk from "./ProductionDesk";
import { SEED_BATCHES, productionExceptions, batchStates } from "./production";
import {
  documentRegisterBlob,
  documentRegisterFilename,
  trainingMatrixBlob,
  trainingMatrixFilename,
  docSheetBlob,
  docSheetFilename,
  download,
} from "./records-pdf";
import { SEED_READINGS, loadReadings, saveReadings, exceptions as checkExceptions, type Reading } from "./checks";
import { SEED_MOVEMENTS, shelfLife, declarationGaps, balances, misplaced, loadMovements, saveMovements, type Movement } from "./stock";
import QuestionnaireDesk from "./QuestionnaireDesk";
import Welcome from "./Welcome";
import StockDesk from "./StockDesk";
import CheckDesk from "./CheckDesk";
import SopDesk from "./SopDesk";
import RecallDesk from "./RecallDesk";
import MonitorDesk from "./MonitorDesk";
import { source as telemetry, board as telemetryBoard } from "./telemetry";
import { SEED_RUNS, loadRuns, saveRuns, schedule as sopSchedule, sopById, fmtAgo, minsAgo as runMinsAgo, type Run } from "./sop";

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
  { id: "documents", label: "Documents" },
  { id: "personnel", label: "Personnel" },
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

function buildPicture(movements: Movement[], readings: Reading[], runs: Run[]): Item[] {
  const items: Item[] = [];

  for (const e of productionExceptions(SEED_BATCHES)) {
    items.push({
      severe: e.severe,
      text: `${e.product} (${e.batchId}) — ${e.reason}`,
      goto: "production",
    });
  }
  for (const d of DOCUMENTS) {
    const st = dateStatus(d.next);
    if (st === "overdue") items.push({ severe: true, text: `${d.name} review is overdue — was due ${d.next}, ${dueLabel(d.next)}.`, goto: "documents" });
    else if (st === "due") items.push({ severe: false, text: `${d.name} falls due ${d.next}, ${dueLabel(d.next)}.`, goto: "documents" });
  }
  for (const t of TRAINING) {
    const st = dateStatus(t.expires);
    if (st === "overdue") items.push({ severe: true, text: `${t.person}'s ${t.cert} certificate expired ${t.expires}, ${dueLabel(t.expires)}.`, goto: "personnel" });
    else if (st === "due") items.push({ severe: false, text: `${t.person}'s ${t.cert} certificate expires ${t.expires}, ${dueLabel(t.expires)}.`, goto: "personnel" });
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
  for (const e of checkExceptions(readings)) {
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

  for (const d of sopSchedule(runs)) {
    if (d.state === "due") items.push({ severe: false, text: `${d.sop.name} has not been run today.`, goto: "procedures" });
  }
  for (const r of runs) {
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
    personnel: { n: 0, severe: false },
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

// Which part of the business each section belongs to. A flat list of
// everything needing a decision does not tell you whether this is a
// stock morning or an audit morning; grouping does, at a glance.
const AREAS: { key: string; title: string; sections: SectionId[] }[] = [
  { key: "stock", title: "Stock and traceability", sections: ["stock", "trace"] },
  { key: "monitoring", title: "Monitoring", sections: ["checks", "coldchain"] },
  { key: "production", title: "Production", sections: ["production"] },
  { key: "procedures", title: "Procedures", sections: ["procedures"] },
  { key: "audit", title: "Documents and audit", sections: ["documents", "questionnaires"] },
  { key: "people", title: "People", sections: ["personnel"] },
];

function Legend() {
  const keys: { colour: string; word: string; means: string }[] = [
    { colour: VERM, word: "Serious", means: "act today" },
    { colour: BRASS, word: "Watch", means: "due, or inside tolerance" },
    { colour: GREEN, word: "In spec", means: "nothing to do" },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 20px",
        alignItems: "center",
        padding: "11px 16px",
        marginBottom: 18,
        border: "1px solid var(--rule)",
        borderRadius: 12,
        background: "var(--bg-elevated)",
      }}
    >
      {keys.map((k) => (
        <span key={k.word} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <span
            aria-hidden
            style={{ width: 12, height: 12, borderRadius: 3, background: k.colour, flexShrink: 0 }}
          />
          <span style={{ color: k.colour, fontWeight: 500 }}>{k.word}</span>
          <span style={{ color: MUTED }}>{k.means}</span>
        </span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
        <span className="prov-urgent" aria-hidden style={{ marginRight: 0 }}>
          !
        </span>
        <span style={{ color: MUTED }}>marks the serious ones, so it is not colour alone</span>
      </span>
    </div>
  );
}

function Overview({ items, onGo }: { items: Item[]; onGo: (id: SectionId) => void }) {
  const [today, setToday] = useState("");
  useEffect(() => setToday(todayLabel()), []);
  const label = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.label ?? id;

  const grouped = AREAS.map((a) => {
    const own = items.filter((e) => a.sections.includes(e.goto));
    return { ...a, items: own, severe: own.filter((e) => e.severe).length };
  });
  const busy = grouped.filter((g) => g.items.length > 0);
  const quiet = grouped.filter((g) => g.items.length === 0);

  // Every group starts closed. Opening the ones with something severe in
  // them sounds better than it is: with real data every group has
  // something severe, so it would open all four and leave the same
  // fifty-odd item list. Closed makes the page a summary you can read in
  // one screen, each heading carrying its total and how many of those
  // are serious, and opening one is a tap.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (g: (typeof grouped)[number]) => !!open[g.key];

  return (
    <>
      <SectionTitle
        title="What needs a decision"
        sub={
          today
            ? `${today}. Read from every register across the factory, three shops and two vans. Quiet lines are working lines.`
            : undefined
        }
      />
      <Legend />
      {busy.length > 0 && (
        <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 18, lineHeight: 1.55 }}>
          {items.length} outstanding
          {items.filter((e) => e.severe).length > 0 && (
            <>
              , <span style={{ color: VERM }}>{items.filter((e) => e.severe).length} serious</span>
            </>
          )}
          . Open a heading to see them.
        </p>
      )}
      {busy.map((g) => {
        const shown = isOpen(g);
        return (
          <div
            key={g.key}
            style={{
              border: "1px solid var(--rule)",
              borderLeft: `3px solid ${g.severe > 0 ? VERM : BRASS}`,
              borderRadius: 12,
              background: "var(--bg-elevated)",
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpen((prev) => ({ ...prev, [g.key]: !shown }))}
              aria-expanded={shown}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                rowGap: 6,
                gap: 12,
                padding: "15px 18px",
                background: "none",
                border: "none",
                font: "inherit",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span aria-hidden style={{ ...mono, fontSize: 12, color: MUTED, width: 12 }}>
                {shown ? "\u2212" : "+"}
              </span>
              <span style={{ flex: "1 1 180px", minWidth: 0, fontSize: 14.5 }}>{g.title}</span>
              {g.severe > 0 && (
                <span style={{ ...mono, fontSize: 11.5, color: VERM, whiteSpace: "nowrap" }}>
                  {g.severe} serious
                </span>
              )}
              <span style={{ ...mono, fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>
                total {g.items.length}
              </span>
            </button>
            {shown && (
              <div style={{ display: "grid", gap: 10, padding: "4px 18px 18px", borderTop: "1px solid var(--rule)" }}>
                {g.items.map((e, i) => (
                  <button key={i} onClick={() => onGo(e.goto)} className="prov-item">
                    <span className="prov-item-bar" style={{ background: e.severe ? VERM : BRASS }} />
                    <span className="prov-item-text">
                      {e.severe && (
                        <span className="prov-urgent" aria-label="Serious">
                          !
                        </span>
                      )}
                      {e.text}
                    </span>
                    <span className="prov-item-goto">{label(e.goto)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {busy.length === 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ fontSize: 14, color: GREEN }}>Nothing needs a decision today.</p>
        </div>
      )}

      {quiet.length > 0 && busy.length > 0 && (
        <p style={{ fontSize: 13, color: MUTED, marginTop: 20, marginBottom: 6, lineHeight: 1.55 }}>
          Nothing outstanding in {quiet.map((g) => g.title.toLowerCase()).join(", ")}.
        </p>
      )}
      <p style={{ fontSize: 13, color: MUTED, marginTop: 18, lineHeight: 1.55 }}>
        {(() => {
          const all = batchStates(SEED_BATCHES);
          const held = all.filter((b) => b.status === "overdue" && !b.batch.stopped).length;
          const units = all.filter((b) => !b.batch.stopped).reduce((a, b) => a + b.batch.unitsMade, 0);
          return `${all.length} batches this week, ${units.toLocaleString("en-GB")} units packed, ${held === 0 ? "all releasable" : `${held} not releasable`}.`;
        })()}
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

// ————————————————————————— documents and training —————————————————————————
//
// "Audit readiness" was a word, not a measurement — there was nothing
// behind it. What an auditor actually asks is narrower and answerable:
// which controlled documents are past review, and who is working today
// on a certificate that has lapsed.
//
// Training reads by person, because that is the question. One row per
// certificate told you a certificate had expired; it did not tell you
// that S. Trent is on the counter without allergen awareness.

function DocStatusPill({ status }: { status: Status }) {
  return (
    <span
      style={{
        ...mono,
        fontSize: 11,
        letterSpacing: "0.06em",
        color: STATUS_COLOR[status],
        border: `1px solid ${STATUS_COLOR[status]}`,
        borderRadius: 99,
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_WORD[status].toUpperCase()}
    </span>
  );
}

function Person({
  name,
  role,
  certs,
}: {
  name: string;
  role: string;
  certs: { cert: string; expires: string }[];
}) {
  const [open, setOpen] = useState(false);
  const expired = certs.filter((c) => dateStatus(c.expires) === "overdue");
  const soon = certs.filter((c) => dateStatus(c.expires) === "due");
  const worst: Status = expired.length ? "overdue" : soon.length ? "due" : "ok";

  const summary = expired.length
    ? `${expired.length} expired${soon.length ? `, ${soon.length} due soon` : ""}`
    : soon.length
      ? `${soon.length} due soon`
      : "all current";

  return (
    <div style={{ border: "1px solid var(--rule)", borderLeft: `3px solid ${STATUS_COLOR[worst]}`, borderRadius: 12, background: "var(--bg-elevated)", marginBottom: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6, gap: 14,
          padding: "13px 16px", background: "none", border: "none",
          font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left",
        }}
      >
        <span aria-hidden style={{ ...mono, fontSize: 12, color: MUTED, width: 12 }}>
          {open ? "\u2212" : "+"}
        </span>
        <span style={{ flex: "1 1 200px", minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5 }}>{name}</span>
          <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2 }}>{role}</span>
        </span>
        <span style={{ fontSize: 12.5, color: STATUS_COLOR[worst], whiteSpace: "nowrap" }}>{summary}</span>
        <span style={{ ...mono, fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>
          {certs.length} certificate{certs.length === 1 ? "" : "s"}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--rule)", padding: "4px 16px 12px 42px" }}>
          {[...certs]
            .sort((a, b) => (daysUntil(a.expires) ?? 0) - (daysUntil(b.expires) ?? 0))
            .map((c) => {
              const st = dateStatus(c.expires);
              return (
                <div
                  key={c.cert}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "9px 0", borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13.5 }}>{c.cert}</span>
                  <span style={{ ...mono, fontSize: 12, color: MUTED }}>{c.expires}</span>
                  <span style={{ ...mono, fontSize: 12, color: STATUS_COLOR[st], ...col(92) }}>
                    {st === "overdue" ? `expired ${dueLabel(c.expires)}` : dueLabel(c.expires)}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function Documents() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const docs = [...DOCUMENTS].sort(
    (a, b) => (daysUntil(a.next) ?? 0) - (daysUntil(b.next) ?? 0),
  );
  const docOverdue = docs.filter((d) => dateStatus(d.next) === "overdue");
  const docSoon = docs.filter((d) => dateStatus(d.next) === "due");

  return (
    <>
      <SectionTitle
        title="Controlled documents"
        sub="The register the questionnaire answers draw from. Status is read from the review date, so nothing here can call a review upcoming after it has passed. Training and sign-offs live under Personnel."
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <Tally n={docOverdue.length} label="documents past review" color={docOverdue.length ? VERM : GREEN} />
        <Tally n={docSoon.length} label="due within 60 days" color={docSoon.length ? BRASS : GREEN} />
        <div style={{ marginLeft: "auto" }}>
          <DocExport
            label="Export register"
            build={async () => download(await documentRegisterBlob(DOCUMENTS, ""), documentRegisterFilename())}
          />
        </div>
      </div>

      <h3 style={{ ...serif, fontWeight: 500, fontSize: 19, color: "var(--text)", marginBottom: 4 }}>
        Controlled documents
      </h3>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 1.55, maxWidth: 640 }}>
        Soonest review first. Superseded versions are kept — if an incident happened in March, an auditor asks what
        the procedure said in March, not what it says now.
      </p>
      <div
        style={{
          overflowX: "auto",
          marginBottom: 34,
          border: "1px solid var(--rule)",
          borderRadius: 12,
          background: "var(--bg-elevated)",
          padding: "4px 16px 8px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
          <thead>
            <tr>
              <th style={th}>Document</th>
              <th style={th}>Ref</th>
              <th style={th}>Version</th>
              <th style={th}>Owner</th>
              <th style={th}>Last review</th>
              <th style={th}>Next review</th>
              <th style={th}>State</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const st = dateStatus(d.next);
              const isOpen = openDoc === d.ref;
              return (
                <Fragment key={d.ref}>
                <tr
                  onClick={() => setOpenDoc(isOpen ? null : d.ref)}
                  style={{ cursor: "pointer" }}
                  title={isOpen ? "Hide version history" : "Show version history"}
                >
                  <td style={td}>
                    <span aria-hidden style={{ ...mono, fontSize: 11, color: MUTED, marginRight: 8 }}>
                      {isOpen ? "\u2212" : "+"}
                    </span>
                    {d.name}
                  </td>
                  <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.ref}</td>
                  <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.version}</td>
                  <td style={{ ...td, fontSize: 13, color: MUTED }}>{d.owner}</td>
                  <td style={{ ...td, ...mono, fontSize: 12.5 }}>{d.reviewed}</td>
                  <td style={{ ...td, ...mono, fontSize: 12.5, whiteSpace: "nowrap" }}>
                    {d.next}
                    <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: STATUS_COLOR[st] }}>{dueLabel(d.next)}</span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <DocStatusPill status={st} />
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={7} style={{ padding: "4px 0 18px 26px", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                        <p style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: MUTED }}>
                          VERSION HISTORY ({d.history.length})
                        </p>
                        <DocExport
                          label="Export record sheet"
                          build={async () => download(await docSheetBlob(d, ""), docSheetFilename(d))}
                        />
                      </div>
                      <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, lineHeight: 1.5, maxWidth: 620 }}>
                        Superseded versions are retained. An incident is judged against what the document said at the
                        time, not what it says now.
                      </p>
                      {d.history.map((v, i) => (
                        <div
                          key={`${v.version}-${v.issued}`}
                          style={{
                            display: "flex", gap: 14, padding: "9px 0",
                            borderBottom: "1px solid var(--rule)",
                            borderLeft: i === 0 ? "2px solid var(--text)" : "2px solid transparent",
                            paddingLeft: 12,
                          }}
                        >
                          <span style={{ ...mono, fontSize: 12.5, width: 46, flexShrink: 1, minWidth: 0, fontWeight: i === 0 ? 500 : 400 }}>
                            {v.version}
                          </span>
                          <span style={{ ...mono, fontSize: 12, color: MUTED, width: 86, flexShrink: 1, minWidth: 0 }}>{v.issued}</span>
                          <span style={{ fontSize: 12, color: MUTED, width: 150, flexShrink: 1, minWidth: 0 }}>{v.by}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{v.change}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

    </>
  );
}

function DocExport({ label, build }: { label: string; build: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try { await build(); } finally { setBusy(false); }
      }}
      disabled={busy}
      className="btn btn-primary"
      style={{ fontSize: 13, padding: "7px 14px", whiteSpace: "nowrap" }}
    >
      {busy ? "Preparing\u2026" : label}
    </button>
  );
}

function Tally({ n, label, color = "var(--text)" }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 12, padding: "10px 16px", background: "var(--bg-elevated)" }}>
      <p style={{ ...mono, fontSize: 22, fontWeight: 500, color, lineHeight: 1.1 }}>{n.toLocaleString("en-GB")}</p>
      <p style={{ fontSize: 11.5, color: MUTED }}>{label}</p>
    </div>
  );
}

// ————————————————————————— personnel —————————————————————————
//
// Four questions about a person, in the order they get asked: who are
// they, what do they hold, what are they cleared to do, and have they
// declared themselves fit to work.
//
// The third is the one a certificate cannot answer. Level 2 Food Hygiene
// does not say somebody may start the pasteuriser; a named assessor on a
// named date does.
//
// Fitness records carry the reason, because the exclusion decision
// depends on it. They are marked restricted, they stay on this page, and
// they are in no export. What leaves this system is that a declaration
// was completed before the person handled food.

function Personnel() {
  const [open, setOpen] = useState<string | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const people = PEOPLE.map((p) => {
    const certs = TRAINING.filter((t) => t.person === p.name).map((t) => ({ cert: t.cert, expires: t.expires }));
    const expired = certs.filter((c) => dateStatus(c.expires) === "overdue");
    const soon = certs.filter((c) => dateStatus(c.expires) === "due");
    return { ...p, certs, expired, soon, worst: (expired.length ? "overdue" : soon.length ? "due" : "ok") as Status };
  });

  const lapsed = people.filter((p) => p.expired.length);
  const openRecords = people.filter((p) => p.fitness.some((f) => !f.returned));

  return (
    <>
      <SectionTitle
        title="Personnel"
        sub="Who works here, what they hold, and what each of them is signed off to do. A certificate says somebody was trained; a sign-off says somebody assessed them against a named task on a named date."
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <Tally n={people.length} label="people" />
        <Tally n={lapsed.length} label={lapsed.length === 1 ? "with a lapsed certificate" : "with lapsed certificates"} color={lapsed.length ? VERM : GREEN} />
        <Tally n={people.reduce((a, p) => a + p.signOffs.length, 0)} label="task sign-offs held" />
        <div style={{ marginLeft: "auto" }}>
          <DocExport
            label="Export training matrix"
            build={async () => download(await trainingMatrixBlob(TRAINING, ""), trainingMatrixFilename())}
          />
        </div>
      </div>

      {openRecords.length > 0 && (
        <div style={{ border: `1px solid ${VERM}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: 13.5, color: VERM }}>
            {openRecords.length} fitness-to-work declaration{openRecords.length === 1 ? "" : "s"} without a recorded return.
          </p>
        </div>
      )}

      {people
        .sort((a, b) => {
          const rank = (x: (typeof people)[number]) => (x.worst === "overdue" ? 0 : x.worst === "due" ? 1 : 2);
          return rank(a) - rank(b) || a.name.localeCompare(b.name);
        })
        .map((p) => {
          const isOpen = open === p.name;
          const summary = p.expired.length
            ? `${p.expired.length} expired${p.soon.length ? `, ${p.soon.length} due soon` : ""}`
            : p.soon.length
              ? `${p.soon.length} due soon`
              : "all current";
          return (
            <div key={p.name} style={{ border: "1px solid var(--rule)", borderLeft: `3px solid ${STATUS_COLOR[p.worst]}`, borderRadius: 12, background: "var(--bg-elevated)", marginBottom: 8, overflow: "hidden" }}>
              <button
                onClick={() => setOpen(isOpen ? null : p.name)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6, gap: 14,
                  padding: "14px 16px", background: "none", border: "none",
                  font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left",
                }}
              >
                <span aria-hidden style={{ ...mono, fontSize: 12, color: MUTED, width: 12 }}>{isOpen ? "\u2212" : "+"}</span>
                <span style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15 }}>{p.name}</span>
                  <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2 }}>
                    <span style={{ whiteSpace: "nowrap" }}>{p.role}</span> ·{" "}
                    <span style={{ whiteSpace: "nowrap" }}>{p.site}</span>
                  </span>
                </span>
                <span style={{ fontSize: 12.5, color: STATUS_COLOR[p.worst], whiteSpace: "nowrap" }}>{summary}</span>
                <span style={{ ...mono, fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>
                  {p.signOffs.length} sign-off{p.signOffs.length === 1 ? "" : "s"}
                </span>
              </button>

              {isOpen && (
                <div style={{ borderTop: "1px solid var(--rule)", padding: "16px 20px 18px 42px" }}>
                  <PersonBlock title="Details">
                    <Detail k="Role" v={p.role} />
                    <Detail k="Site" v={p.site} />
                    <Detail k="Started" v={p.started} />
                    <Detail k="Inducted" v={p.inducted} />
                  </PersonBlock>

                  <PersonBlock title={`Certificates (${p.certs.length})`}>
                    <div style={{ ...rowStyle, paddingBottom: 6 }}>
                      <span style={{ ...mono, flex: 1, fontSize: 10, letterSpacing: "0.12em", color: MUTED }}>CERTIFICATE</span>
                      <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(110) }}>EXPIRES</span>
                      <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(150) }}>REMAINING</span>
                    </div>
                    {[...p.certs]
                      .sort((a, b) => (daysUntil(a.expires) ?? 0) - (daysUntil(b.expires) ?? 0))
                      .map((c) => {
                        const st = dateStatus(c.expires);
                        return (
                          <div key={c.cert} style={rowStyle}>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{c.cert}</span>
                            <span style={{ ...mono, fontSize: 12, color: MUTED, ...col(110) }}>{c.expires}</span>
                            <span style={{ ...mono, fontSize: 12, fontWeight: 500, color: STATUS_COLOR[st], ...col(150) }}>
                              {st === "overdue" ? `expired ${dueLabel(c.expires)}` : dueLabel(c.expires)}
                            </span>
                          </div>
                        );
                      })}
                  </PersonBlock>

                  <PersonBlock title={`Signed off to do (${p.signOffs.length})`}>
                    <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>
                      Assessed against the task by a named person. A procedure run should be attributable to
                      somebody holding the sign-off for it.
                    </p>
                    <div style={{ ...rowStyle, paddingBottom: 6 }}>
                      <span style={{ ...mono, flex: 1, fontSize: 10, letterSpacing: "0.12em", color: MUTED }}>TASK</span>
                      <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(150) }}>ASSESSED BY</span>
                      <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: MUTED, ...col(110) }}>ON</span>
                    </div>
                    {p.signOffs.map((sg) => (
                      <div key={sg.task} style={rowStyle}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
                          {sg.task}
                          {sg.sop ? <span style={{ ...mono, fontSize: 11, color: MUTED }}> · {sg.sop}</span> : null}
                        </span>
                        <span style={{ fontSize: 12, color: MUTED, ...col(150) }}>{sg.assessedBy}</span>
                        <span style={{ ...mono, fontSize: 12, color: MUTED, ...col(110) }}>{sg.assessed}</span>
                      </div>
                    ))}
                  </PersonBlock>

                  <PersonBlock title={`Fitness to work (${p.fitness.length})`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", color: VERM, border: `1px solid ${VERM}`, borderRadius: 99, padding: "2px 9px" }}>
                        RESTRICTED
                      </span>
                      <span style={{ fontSize: 12.5, color: MUTED }}>
                        Held for the exclusion decision. Never exported, never shown to an auditor.
                      </span>
                    </div>
                    {p.fitness.length === 0 ? (
                      <p style={{ fontSize: 13, color: MUTED }}>No declarations recorded.</p>
                    ) : (
                      <>
                        {showReasons ? (
                          <button
                            onClick={() => { setShowReasons(false); setConfirming(false); }}
                            style={{ font: "inherit", fontSize: 12, padding: "4px 11px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer", marginBottom: 8 }}
                          >
                            Hide reasons
                          </button>
                        ) : confirming ? (
                          <div style={{ border: `1px solid ${VERM}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, maxWidth: 520 }}>
                            <p style={{ fontSize: 13, marginBottom: 4 }}>
                              Reasons for absence are restricted to the quality manager and directors.
                            </p>
                            <p style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
                              Opening them is your confirmation that you hold that role. Enforcement by account role
                              arrives when the system moves off this browser.
                            </p>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => { setShowReasons(true); setConfirming(false); }}
                                className="btn btn-primary"
                                style={{ fontSize: 12.5, padding: "6px 13px" }}
                              >
                                I am authorised
                              </button>
                              <button
                                onClick={() => setConfirming(false)}
                                style={{ font: "inherit", fontSize: 12.5, padding: "6px 13px", border: "1px solid var(--rule-strong)", background: "transparent", color: "inherit", borderRadius: 999, cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirming(true)}
                            style={{ font: "inherit", fontSize: 12, padding: "4px 11px", border: `1px solid ${VERM}`, color: VERM, background: "transparent", borderRadius: 999, cursor: "pointer", marginBottom: 8 }}
                          >
                            Show reasons
                          </button>
                        )}
                        {p.fitness.map((f) => (
                          <div key={f.date} style={rowStyle}>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
                              {showReasons ? f.reason : "Declaration completed"}
                            </span>
                            <span style={{ ...mono, fontSize: 12, color: MUTED, ...col(110) }}>{f.date}</span>
                            <span style={{ ...mono, fontSize: 12, color: f.returned ? GREEN : VERM, ...col(150) }}>
                              {f.returned ? `returned ${f.returned}` : "no return recorded"}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </PersonBlock>
                </div>
              )}
            </div>
          );
        })}
    </>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid var(--rule)",
};

// A fixed-width column has to be told not to shrink: the default lets a
// long value squeeze its own cell and drag the next one out from under
// its heading, which is exactly what made the dates drift row to row.
// A column that holds its width where there is room and gives it up
// where there is not. Refusing to shrink kept desktop alignment honest
// and pushed the whole page sideways on a phone; shrinking from a width
// basis only takes effect once space actually runs short, so a wide
// screen is unchanged and a narrow one compresses instead of overflowing.
function col(width: number, extra: React.CSSProperties = {}): React.CSSProperties {
  return { width, flexShrink: 1, minWidth: 0, textAlign: "right", ...extra };
}

function PersonBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: MUTED, marginBottom: 8 }}>
        {title.toUpperCase()}
      </p>
      {children}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div style={rowStyle}>
      <span style={{ flex: 1, fontSize: 13, color: MUTED }}>{k}</span>
      <span style={{ ...mono, fontSize: 13, ...col(260) }}>{v}</span>
    </div>
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
  const [view, setViewRaw] = useState<"start" | SectionId>("start");
  // Where you were before this. Jumping from the overview into a section
  // left no way back except finding it again in the sidebar.
  const [prev, setPrev] = useState<"start" | SectionId | null>(null);
  const setView = (next: "start" | SectionId) => {
    setViewRaw((current) => {
      setPrev(current === next ? null : current);
      return next;
    });
  };
  const back = () => {
    if (!prev) return;
    setViewRaw(prev);
    setPrev(null);
  };
  const [drawer, setDrawer] = useState(false);
  // A drawer that leaves the page scrolling behind it feels broken.
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);
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

  // Recorded checks and procedure runs sit here for the same two
  // reasons the stock log does. They survive moving between sections,
  // and the overview reads the very arrays the desks write to — so a
  // check recorded at the desk changes this morning's picture and the
  // sidebar count on the way back, rather than leaving them frozen on
  // seed data while claiming to be drawn from every register.
  const [readings, setReadings] = useState<Reading[]>(SEED_READINGS);
  const [readingsLoaded, setReadingsLoaded] = useState(false);
  useEffect(() => {
    setReadings(loadReadings());
    setReadingsLoaded(true);
  }, []);
  useEffect(() => {
    if (readingsLoaded) saveReadings(readings);
  }, [readings, readingsLoaded]);

  const [runs, setRuns] = useState<Run[]>(SEED_RUNS);
  const [runsLoaded, setRunsLoaded] = useState(false);
  useEffect(() => {
    setRuns(loadRuns());
    setRunsLoaded(true);
  }, []);
  useEffect(() => {
    if (runsLoaded) saveRuns(runs);
  }, [runs, runsLoaded]);

  const picture = useMemo(() => buildPicture(movements, readings, runs), [movements, readings, runs]);
  const counts = useMemo(() => countsFor(picture), [picture]);
  const openFlags = useMemo(
    () => Object.values(counts).reduce((a, c) => a + c.n, 0),
    [counts],
  );
  const severeOpen = useMemo(() => Object.values(counts).some((c) => c.severe), [counts]);
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
  // The welcome screen returns earlier, so by here there is always a
  // section to name.
  const activeLabel = SECTIONS.find((x) => x.id === active)?.label ?? "Salcombe Dairy";

  return (
    <div className="pv-root">
      {/* The mobile header. Hidden on desktop, where the sidebar is
          always there and a bar would be one more thing to look at. */}
      <header className="prov-topbar">
        <button
          className="prov-burger"
          onClick={() => setDrawer(true)}
          aria-label="Open sections"
          aria-expanded={drawer}
        >
          <span aria-hidden />
          <span aria-hidden />
          <span aria-hidden />
        </button>
        <span className="prov-topbar-title">{activeLabel}</span>
        {openFlags > 0 && (
          <button
            className="prov-topbar-open"
            onClick={() => setView("overview")}
            aria-label={`${openFlags} things need a decision. Go to the overview.`}
          >
            <span className={`pv-flag${severeOpen ? " pv-flag-severe" : ""}`}>{openFlags}</span>
            <span className="prov-topbar-open-label">to decide</span>
          </button>
        )}
      </header>

      {drawer && (
        <div
          className="prov-scrim"
          onClick={() => setDrawer(false)}
          aria-hidden
        />
      )}

      <div className="prov-shell">
        <aside className={`prov-side${drawer ? " prov-side-open" : ""}`}>
          <div className="prov-sidehead">
            <button
              onClick={() => {
                setView("start");
                setDrawer(false);
              }}
              className="prov-wordmark"
              aria-label="Back to start"
            >
              Salcombe Dairy
            </button>
            <button
              className="prov-drawerclose"
              onClick={() => setDrawer(false)}
              aria-label="Close sections"
            >
              &#215;
            </button>
          </div>

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
                  onClick={() => {
                    setView(s.id);
                    setDrawer(false);
                  }}
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
            {prev && prev !== active && (
              <button onClick={back} className="prov-back">
                <span aria-hidden className="prov-back-arrow">&#8592;</span>
                Back to {prev === "start" ? "the welcome page" : SECTIONS.find((x) => x.id === prev)?.label}
              </button>
            )}
            {active === "overview" && <Overview items={picture} onGo={setView} />}
            {active === "questionnaires" && <Questionnaires />}
            {active === "documents" && <Documents />}
            {active === "personnel" && <Personnel />}
            {active === "trace" && <RecallDesk movements={movements} onMovements={setMovements} operator={operator} />}
            {active === "stock" && <StockDesk operator={operator} movements={movements} onMovements={setMovements} />}
            {active === "coldchain" && <MonitorDesk />}
            {active === "production" && <ProductionDesk operator={operator} />}
            {active === "checks" && <CheckDesk operator={operator} readings={readings} onReadings={setReadings} />}
            {active === "procedures" && <SopDesk operator={operator} runs={runs} onRuns={setRuns} />}
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
        .pv-root .prov-back {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--rule-strong);
          border-radius: 99px;
          padding: 9px 18px 9px 14px;
          margin-bottom: 24px;
          font-family: var(--font-sans); font-size: 13.5px;
          font-weight: 500;
          color: var(--text); cursor: pointer;
          box-shadow: 0 1px 2px rgba(20, 33, 58, 0.06);
          transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        .pv-root .prov-back:hover {
          background: var(--bg-surface);
          border-color: var(--navy);
          box-shadow: 0 2px 6px rgba(20, 33, 58, 0.1);
        }
        .pv-root .prov-back:active { box-shadow: none; }
        .pv-root .prov-back-arrow {
          font-size: 16px; line-height: 1;
          color: var(--navy);
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
        .prov-shell > * { min-width: 0; }
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
          min-width: 0;
        }
        .prov-view { min-width: 0; }
        /* Anything genuinely too wide for the screen scrolls inside its
           own box rather than taking the page with it. */
        .prov-main table { max-width: 100%; }

        /* ————— mobile header and drawer ————— */
        .prov-topbar { display: none; }
        .prov-topbar-open { display: none; }
        .prov-scrim { display: none; }
        .prov-sidehead { display: contents; }
        .prov-drawerclose { display: none; }

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
        .prov-urgent {
          display: inline-grid;
          place-items: center;
          width: 17px;
          height: 17px;
          margin-right: 8px;
          vertical-align: -3px;
          border-radius: 999px;
          background: #c22f4e;
          color: #fff;
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          flex-shrink: 0;
        }
        .prov-item-goto { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
        @media (max-width: 600px) {
          .prov-item { grid-template-columns: 3px 1fr; }
          .prov-item-bar { grid-row: 1 / span 2; }
          .prov-item-goto { grid-column: 2; margin-top: -6px; }
        }

        /* The content settles into place: a short fade up from a few
           pixels below. It arrives; it does not perform. */
        .prov-view { animation: provsettle 240ms cubic-bezier(.2,.7,.2,1); }
        @keyframes provfade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes provslide {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes provsettle {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .prov-view { animation: none; }
          .prov-marker { transition: none; }
          .prov-side { transition: none; }
          .prov-scrim { animation: none; }
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
          /* The bar is fixed so navigation is one tap from anywhere on a
             long page, and its top padding clears the status bar — which
             is what was letting the clock sit on the filter pills. */
          .prov-topbar {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 60;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px;
            background: var(--navy);
            color: var(--on-navy);
            box-shadow: 0 1px 0 rgba(255,255,255,0.07);
          }
          .prov-topbar-title {
            flex: 1;
            min-width: 0;
            font-family: var(--font-serif);
            font-size: 17px;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .prov-topbar-open {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            background: none;
            border: none;
            padding: 4px 2px;
            cursor: pointer;
            flex-shrink: 0;
          }
          .prov-topbar-open-label {
            font-size: 11.5px;
            color: var(--on-navy);
            opacity: 0.8;
            white-space: nowrap;
          }
          .prov-burger {
            display: grid;
            gap: 4px;
            width: 34px;
            padding: 6px 4px;
            background: none;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
          }
          .prov-burger span {
            display: block;
            height: 2px;
            border-radius: 2px;
            background: var(--on-navy);
          }

          .prov-scrim {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 70;
            background: rgba(10, 18, 32, 0.5);
            animation: provfade 160ms ease;
          }

          .prov-shell { grid-template-columns: 1fr; }
          .prov-main { padding-top: calc(env(safe-area-inset-top, 0px) + 68px); }

          .prov-sidehead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .prov-drawerclose {
            display: block;
            background: none;
            border: none;
            color: var(--on-navy);
            font-size: 26px;
            line-height: 1;
            padding: 0 4px;
            cursor: pointer;
            opacity: 0.75;
          }
          /* Off-screen until the burger asks for it. Not display:none —
             the marker measures the active item on mount, and an element
             with no layout measures as nothing. */
          .prov-side {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            width: min(82vw, 300px);
            z-index: 80;
            height: 100dvh;
            overflow-y: auto;
            padding: calc(env(safe-area-inset-top, 0px) + 18px) 18px
                     calc(env(safe-area-inset-bottom, 0px) + 18px);
            transform: translateX(-100%);
            transition: transform 220ms cubic-bezier(.2,.7,.2,1);
            box-shadow: none;
          }
          .prov-side-open {
            transform: translateX(0);
            box-shadow: 0 0 40px rgba(10, 18, 32, 0.35);
          }
          .prov-wordmark { margin: 0; font-size: 20px; }
          /* The drawer is the sidebar again: vertical, so the gold marker
             does the job it was designed for rather than showing slivers
             at the corners of a horizontal strip. */
          .prov-nav { display: grid; gap: 2px; }
          .prov-marker { display: block; }
          .prov-navitem { width: 100%; border-radius: 8px; padding: 10px 12px; }
          .prov-sidefoot { display: block; }
          .prov-chain { grid-template-columns: 1fr; }
          .prov-node { transform: rotate(90deg); width: 120px; margin: 0 auto; }
        }
      `}</style>
  );
}
