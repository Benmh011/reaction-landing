"use client";

// ————————————————————————————————————————————————————————————————
// The procedures desk.
//
// A procedure runs as a thread: the procedure asks, the operator
// answers, the thread grows. Every branch is authored and every answer
// is kept, so when the thread ends it is the compliance record — there
// is no separate form.
// ————————————————————————————————————————————————————————————————

import { useMemo, useState } from "react";
import {
  SOPS,
  SEED_RUNS,
  sopById,
  stepById,
  startRun,
  answer as answerStep,
  schedule,
  fmtAgo,
  type Run,
  type Sop,
  type Step,
} from "./sop";

const GREEN = "#167a5b";
const BRASS = "#a3772a";
const VERM = "#c22f4e";
const MUTED = "#6f7482";
const NAVY = "#10284a";
const GOLD = "#c9a24a";

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)", fontWeight: 500, letterSpacing: "-0.01em" };
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const card: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--rule)",
  borderRadius: 12,
  padding: "14px 18px",
};

const input: React.CSSProperties = {
  font: "inherit",
  fontSize: 15,
  padding: "10px 14px",
  border: "1px solid var(--rule-strong)",
  borderRadius: 10,
  background: "var(--bg)",
  color: "inherit",
};

const CADENCE_WORD: Record<Sop["cadence"], string> = {
  daily: "Every day",
  "per batch": "Every batch",
  "per delivery": "Every delivery",
  "on event": "When it happens",
  weekly: "Every week",
};

function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ ...serif, fontSize: 30, lineHeight: 1.08, color: "var(--text)", marginBottom: sub ? 8 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 14.5, color: MUTED, maxWidth: 580, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

// ————————————————————————— the desk —————————————————————————

export default function SopDesk() {
  const [runs, setRuns] = useState<Run[]>(SEED_RUNS);
  const [live, setLive] = useState<Run | null>(null);
  const [viewing, setViewing] = useState<Run | null>(null);
  const [who, setWho] = useState("");

  const due = useMemo(() => schedule(runs), [runs]);

  function begin(sop: Sop) {
    setLive(startRun(sop, who.trim() || "Operator"));
  }

  function give(raw: string) {
    if (!live) return;
    const sop = sopById(live.sopId)!;
    const next = answerStep(sop, live, raw);
    setLive(next);
    if (next.outcome !== "in progress") {
      setRuns((prev) => [next, ...prev]);
    }
  }

  function close() {
    setLive(null);
  }

  if (live) {
    const sop = sopById(live.sopId)!;
    return <Thread sop={sop} run={live} onAnswer={give} onClose={close} />;
  }

  if (viewing) {
    const sop = sopById(viewing.sopId)!;
    return <Thread sop={sop} run={viewing} onClose={() => setViewing(null)} />;
  }

  return (
    <>
      <Title
        title="Procedures"
        sub="Each procedure asks its questions one at a time and records every answer. When it ends, the thread is the record — nothing to write up afterwards. A failed step stops the run and says what to do."
      />

      <div style={{ ...card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: MUTED }}>
          Running as
          <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="M. Reeve" style={{ ...input, fontSize: 13, padding: "6px 10px", marginLeft: 8, width: 150 }} />
        </label>
        <span style={{ fontSize: 12.5, color: MUTED }}>Your name goes on every answer in the record.</span>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 30 }}>
        {due.map(({ sop, lastRun, state }) => (
          <div key={sop.id} style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>
                {state === "due" && <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: BRASS, marginRight: 8 }} />}
                {sop.name}
              </p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{sop.purpose}</p>
              <p style={{ fontSize: 12, color: state === "due" ? BRASS : MUTED, marginTop: 5 }}>
                {CADENCE_WORD[sop.cadence]}
                {state === "due" ? " — not yet run today." : "."}
                {lastRun ? ` Last run ${fmtAgo(lastRun.minsAgo)} by ${lastRun.by}${lastRun.outcome === "stopped" ? ", stopped" : ""}.` : ""}
              </p>
            </div>
            <button onClick={() => begin(sop)} className="btn btn-primary" style={{ fontSize: 13.5, padding: "9px 16px" }}>
              Start
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ ...serif, fontSize: 20, color: "var(--text)", marginBottom: 12 }}>Recent runs</h2>
      <div style={{ display: "grid", gap: 6 }}>
        {runs.map((r) => {
          const sop = sopById(r.sopId);
          const color = r.outcome === "complete" ? GREEN : r.outcome === "stopped" ? VERM : BRASS;
          const flagged = r.answers.some((a) => a.flag);
          return (
            <button
              key={r.id}
              onClick={() => setViewing(r)}
              style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto", gap: 14, padding: "11px 15px", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
            >
              <div>
                <p style={{ fontSize: 14 }}>
                  <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: color, marginRight: 8 }} />
                  {sop?.name ?? r.sopId}
                  {flagged && <span style={{ fontSize: 12, color: BRASS }}> · flagged</span>}
                </p>
                <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                  {r.by} · {fmtAgo(r.minsAgo)} · {r.answers.length} of {sop?.steps.length ?? "?"} steps
                </p>
              </div>
              <span style={{ fontSize: 12.5, color, textTransform: "capitalize", whiteSpace: "nowrap" }}>{r.outcome}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ————————————————————————— the thread —————————————————————————

function Thread({
  sop,
  run,
  onAnswer,
  onClose,
}: {
  sop: Sop;
  run: Run;
  onAnswer?: (raw: string) => void;
  onClose: () => void;
}) {
  const current = stepById(sop, run.stepId);
  const readOnly = !onAnswer || run.outcome !== "in progress";
  const done = run.answers.length;
  const total = sop.steps.length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>
            {sop.id} · {sop.reference}
          </p>
          <h1 style={{ ...serif, fontSize: 26, lineHeight: 1.1, color: "var(--text)" }}>{sop.name}</h1>
          <p style={{ ...mono, fontSize: 11.5, color: MUTED, marginTop: 6 }}>
            {run.by} · started {run.startedAt}
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "7px 13px", fontSize: 13, cursor: "pointer", color: "inherit", font: "inherit" }}>
          {readOnly ? "Back to procedures" : "Leave without finishing"}
        </button>
      </div>

      <div className="sop-thread">
        {run.answers.map((a, i) => {
          const step = stepById(sop, a.stepId)!;
          return (
            <div key={i} className="sop-exchange">
              <div className="sop-ask">
                <p className="sop-prompt">{step.prompt}</p>
              </div>
              <div className="sop-reply" data-passed={a.passed} data-flag={a.flag ? "true" : undefined}>
                <p className="sop-value">{a.value}</p>
                <p className="sop-meta">
                  {a.at}
                  {!a.passed ? " · did not pass" : a.flag ? " · noted" : ""}
                </p>
                {a.flag && <p className="sop-flag">{a.flag}</p>}
              </div>
            </div>
          );
        })}

        {run.outcome === "stopped" && (
          <div className="sop-stop">
            <p style={{ ...serif, fontSize: 18, color: VERM, marginBottom: 6 }}>Stopped</p>
            <p style={{ fontSize: 14, lineHeight: 1.55 }}>{run.stopAction}</p>
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>
              This run is on the record as stopped at step {done} of {total}. Start it again from the beginning once the action is done.
            </p>
          </div>
        )}

        {run.outcome === "complete" && (
          <div className="sop-end">
            <p style={{ ...serif, fontSize: 18, color: GREEN, marginBottom: 6 }}>Complete</p>
            <p style={{ fontSize: 14, lineHeight: 1.55 }}>
              {sop.name} — every step passed{run.answers.some((a) => a.flag) ? ", with notes for a supervisor to see" : ""}. Recorded against {run.by}.
            </p>
          </div>
        )}

        {!readOnly && current && (
          <div className="sop-exchange">
            <div className="sop-ask sop-ask-live">
              <p className="sop-step">
                Step {done + 1} of {total}
              </p>
              <p className="sop-prompt">{current.prompt}</p>
              {current.guidance && <p className="sop-guidance">{current.guidance}</p>}
            </div>
            <StepInput step={current} onAnswer={onAnswer!} />
          </div>
        )}
      </div>

      <style>{`
        .sop-thread { display: grid; gap: 14px; max-width: 720px; }
        .sop-exchange { display: grid; gap: 8px; }
        .sop-ask {
          justify-self: start;
          max-width: 82%;
          background: var(--bg-elevated);
          border: 1px solid var(--rule);
          border-radius: 14px 14px 14px 4px;
          padding: 12px 16px;
        }
        .sop-ask-live { border-color: var(--rule-strong); }
        .sop-step { font-size: 11.5px; color: ${MUTED}; margin-bottom: 4px; }
        .sop-prompt { font-size: 15px; line-height: 1.45; color: var(--text); }
        .sop-guidance { font-size: 13px; line-height: 1.5; color: ${MUTED}; margin-top: 6px; }
        .sop-reply {
          justify-self: end;
          max-width: 82%;
          background: ${NAVY};
          color: #f4efe4;
          border-radius: 14px 14px 4px 14px;
          padding: 9px 15px;
          min-width: 96px;
          animation: sopin 200ms cubic-bezier(.2,.7,.2,1);
        }
        .sop-reply[data-passed="false"] { background: ${VERM}; }
        .sop-reply[data-flag="true"] { box-shadow: inset 0 0 0 2px ${GOLD}; }
        .sop-value { font-size: 15px; line-height: 1.4; }
        .sop-meta { font-family: var(--font-mono); font-size: 11px; opacity: 0.7; margin-top: 2px; }
        .sop-flag { font-size: 12.5px; line-height: 1.45; color: ${GOLD}; margin-top: 6px; }
        .sop-input { justify-self: end; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 82%; }
        .sop-choice {
          font: inherit; font-size: 14px;
          padding: 9px 15px;
          border: 1px solid ${NAVY};
          border-radius: 999px;
          background: transparent;
          color: ${NAVY};
          cursor: pointer;
          transition: background 140ms ease, color 140ms ease;
        }
        .sop-choice:hover { background: ${NAVY}; color: #f4efe4; }
        .sop-choice-no { border-color: ${VERM}; color: ${VERM}; }
        .sop-choice-no:hover { background: ${VERM}; color: #fff; }
        .sop-stop, .sop-end {
          justify-self: start;
          max-width: 82%;
          background: var(--bg-elevated);
          border: 1px solid var(--rule);
          border-left: 3px solid ${VERM};
          border-radius: 4px 14px 14px 14px;
          padding: 14px 18px;
        }
        .sop-end { border-left-color: ${GREEN}; }
        @keyframes sopin { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .sop-reply { animation: none; } }
        @media (max-width: 600px) { .sop-ask, .sop-reply, .sop-input, .sop-stop, .sop-end { max-width: 100%; } }
      `}</style>
    </>
  );
}

function StepInput({ step, onAnswer }: { step: Step; onAnswer: (raw: string) => void }) {
  const [draft, setDraft] = useState("");

  if (step.kind === "confirm") {
    return (
      <div className="sop-input">
        <button className="sop-choice" onClick={() => onAnswer("yes")}>Yes</button>
        <button className="sop-choice sop-choice-no" onClick={() => onAnswer("no")}>No</button>
      </div>
    );
  }

  if (step.kind === "choice") {
    return (
      <div className="sop-input">
        {step.options?.map((o) => (
          <button key={o.label} className={`sop-choice${o.next === "stop" ? " sop-choice-no" : ""}`} onClick={() => onAnswer(o.label)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  const isReading = step.kind === "reading";
  const valid = isReading ? Number.isFinite(parseFloat(draft)) : draft.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    onAnswer(draft);
    setDraft("");
  };

  return (
    <div className="sop-input">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={isReading ? `Reading${step.unit ? ` in ${step.unit}` : ""}` : "Type your answer"}
        inputMode={isReading ? "decimal" : "text"}
        style={{ ...input, width: isReading ? 180 : 320, fontFamily: isReading ? "var(--font-mono)" : "inherit" }}
      />
      <button className="btn btn-primary" onClick={submit} disabled={!valid} style={{ fontSize: 14, padding: "9px 18px", opacity: valid ? 1 : 0.5 }}>
        Record
      </button>
    </div>
  );
}
