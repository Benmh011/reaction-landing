"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTIONNAIRES } from "./data";
import {
  parseIncoming,
  downloadCompleted,
  buildCompletedBytes,
  scoreAgainstBank,
  type Chunk,
  type Intake,
  type IntakeReport,
  type WriteCtx,
} from "./intake";

// ————————————————————————————————————————————————————————————————
// The questionnaire desk. Intake and output live in intake.ts; this
// file is the review workflow: report what was read, approve or hold
// each answer, promote anything the extractor wasn't sure about, and
// hand back whichever output the file can safely take.
// ————————————————————————————————————————————————————————————————

const TEAL = "#0e5560";
const SEA = "#167a5b";
const HONEY = "#a3772a";
const RASP = "#c22f4e";
const MUTED = "#77705f";

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

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

type Stage =
  | { name: "intake"; error?: string }
  | { name: "parsing"; fileName: string }
  | { name: "review"; fileName: string; intake: Intake }
  | { name: "done"; fileName: string; intake: Intake };

// ————— the record of completed questionnaires —————

type ArchiveRow = {
  id: string;
  ref: string;
  name: string;
  fileName: string;
  date: string;
  total: number;
  approved: number;
  b64?: string;
};

const ARCHIVE_KEY = "pv-questionnaire-archive";
const MAX_STORED_BYTES = 2_500_000;

const loadArchive = (): ArchiveRow[] => {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    return raw ? (JSON.parse(raw) as ArchiveRow[]) : [];
  } catch {
    return [];
  }
};

const saveArchive = (rows: ArchiveRow[]) => {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(rows));
  } catch {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(rows.map(({ b64, ...r }) => r)));
    } catch {
      /* storage unavailable — session-only */
    }
  }
};

const nextRef = (rows: ArchiveRow[]) => {
  const seeded = QUESTIONNAIRES.map((q) => parseInt(q.id.replace(/\D/g, ""), 10));
  const archived = rows.map((r) => parseInt(r.ref.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  const max = Math.max(0, ...seeded, ...archived);
  return "SPQ-" + String(max + 1).padStart(4, "0");
};

const bufToB64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const b64Download = (b64: string, name: string) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name + ".xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
};

// ————— report card —————

function ReportCard({ report, onPromote }: { report: IntakeReport; onPromote: (i: number) => void }) {
  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        borderLeft: `3px solid ${TEAL}`,
        borderRadius: 12,
        background: "var(--bg-elevated)",
        padding: "14px 18px",
        marginBottom: 16,
      }}
    >
      <p style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: TEAL, marginBottom: 6 }}>
        WHAT THE DESK READ
      </p>
      <p style={{ fontSize: 13.5, marginBottom: 4 }}>
        {report.sheetCount} sheet{report.sheetCount !== 1 ? "s" : ""} · {report.rowsScanned} rows scanned ·{" "}
        {report.questionsFound} questions extracted · <strong>{report.routeReason}</strong>
      </p>
      {report.notes.map((n, i) => (
        <p key={i} style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>
          {n}
        </p>
      ))}
      {report.ambiguous.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--rule)" }}>
          <p style={{ fontSize: 12.5, color: HONEY, marginBottom: 6 }}>
            {report.ambiguous.length} row{report.ambiguous.length > 1 ? "s" : ""} looked question-ish
            but {report.ambiguous.length > 1 ? "weren't" : "wasn't"} extracted — check them against the
            original:
          </p>
          {report.ambiguous.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "3px 0" }}>
              <span style={{ ...mono, fontSize: 11, color: MUTED, flexShrink: 0 }}>
                {a.sheet} · row {a.rowNumber}
              </span>
              <span style={{ fontSize: 12.5, flex: 1 }}>{a.text.slice(0, 110)}</span>
              <button
                onClick={() => onPromote(i)}
                style={{
                  ...mono,
                  fontSize: 11,
                  color: TEAL,
                  background: "none",
                  border: `1px solid ${TEAL}`,
                  borderRadius: 99,
                  padding: "3px 10px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Add as question
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ————— the desk —————

export default function QuestionnaireDesk() {
  const [stage, setStage] = useState<Stage>({ name: "intake" });
  const [archive, setArchive] = useState<ArchiveRow[]>([]);
  const [search, setSearch] = useState("");
  const [recordName, setRecordName] = useState("");
  const [savedRef, setSavedRef] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setArchive(loadArchive()), []);

  useEffect(() => {
    if (stage.name !== "done") {
      setSavedRef(null);
      setRecordName("");
    } else {
      setRecordName(stage.fileName.replace(/\.(xlsx|xlsm|xls|csv)$/i, ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.name]);

  const takeFile = useCallback(async (file: File) => {
    setStage({ name: "parsing", fileName: file.name });
    try {
      const intake = await parseIncoming(file);
      if (intake.chunks.length === 0 && intake.report.ambiguous.length === 0) {
        setStage({
          name: "intake",
          error: "No questions found in that file. Try the sample pack to see the desk working.",
        });
        return;
      }
      setStage({ name: "review", fileName: file.name, intake });
    } catch (e) {
      setStage({
        name: "intake",
        error: e instanceof Error ? e.message : "Couldn't read that file. Try the sample pack to see the desk working.",
      });
    }
  }, []);

  const update = (id: number, patch: Partial<Chunk>) =>
    setStage((s) =>
      s.name === "review"
        ? {
            ...s,
            intake: {
              ...s.intake,
              chunks: s.intake.chunks.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            },
          }
        : s,
    );

  const promote = (i: number) =>
    setStage((s) => {
      if (s.name !== "review") return s;
      const a = s.intake.report.ambiguous[i];
      if (!a) return s;
      const hit = scoreAgainstBank(a.text);
      const chunk: Chunk = {
        id: Math.max(0, ...s.intake.chunks.map((c) => c.id + 1)),
        sheet: a.sheet,
        rowNumber: a.rowNumber,
        answerCol: a.answerCol,
        question: a.text,
        answer: hit ? hit.answer : "",
        source: hit ? hit.source : null,
        state: "draft",
        transcriptOnly: s.intake.writeCtx.route === "transcript" ? true : undefined,
      };
      return {
        ...s,
        intake: {
          ...s.intake,
          chunks: [...s.intake.chunks, chunk],
          report: {
            ...s.intake.report,
            questionsFound: s.intake.report.questionsFound + 1,
            ambiguous: s.intake.report.ambiguous.filter((_, j) => j !== i),
          },
        },
      };
    });

  const saveToRecord = async () => {
    if (stage.name !== "done" || savedRef) return;
    const { bytes } = await buildCompletedBytes(stage.intake.writeCtx, stage.intake.chunks, stage.fileName);
    const b64 = bytes.byteLength <= MAX_STORED_BYTES ? bufToB64(bytes) : undefined;
    const chunks = stage.intake.chunks;
    const row: ArchiveRow = {
      id: String(Date.now()),
      ref: nextRef(archive),
      name: recordName.trim() || stage.fileName.replace(/\.(xlsx|xlsm|xls|csv)$/i, ""),
      fileName: stage.fileName,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      total: chunks.length,
      approved: chunks.filter((c) => c.state === "approved").length,
      b64,
    };
    const rows = [row, ...archive];
    setArchive(rows);
    saveArchive(rows);
    setSavedRef(row.ref);
  };

  // ————— intake —————
  if (stage.name === "intake" || stage.name === "parsing") {
    const parsing = stage.name === "parsing";
    return (
      <div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) takeFile(f);
          }}
          onClick={() => !parsing && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          style={{
            border: `1.5px dashed var(--rule-strong)`,
            borderRadius: 16,
            padding: "38px 28px",
            textAlign: "center",
            cursor: parsing ? "wait" : "pointer",
            background: "var(--bg-elevated)",
          }}
        >
          <p style={{ ...mono, fontSize: 11, letterSpacing: "0.16em", color: TEAL, marginBottom: 10 }}>
            {parsing ? "READING THE FILE…" : "A QUESTIONNAIRE ARRIVES"}
          </p>
          <p style={{ fontSize: 15, color: "var(--text)", marginBottom: 6 }}>
            {parsing ? stage.fileName : "Drop the buyer's file here, exactly as it landed in the inbox."}
          </p>
          {!parsing && (
            <p style={{ fontSize: 13, color: MUTED }}>
              .xlsx, .xls, .xlsm and .csv. The desk extracts the questions, drafts what your
              documents can stand behind, reports anything it wasn't sure of, and queues the
              rest for a person.
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) takeFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {stage.name === "intake" && stage.error && (
          <p style={{ fontSize: 13.5, color: RASP, marginTop: 12 }}>{stage.error}</p>
        )}
        <p style={{ fontSize: 13, color: MUTED, marginTop: 14 }}>
          No questionnaire to hand?{" "}
          <a href="/samples/harbourline-supplier-questionnaire.xlsx" style={{ color: TEAL, fontWeight: 600 }} download>
            Download the sample pack
          </a>{" "}
          — a typical hotel group supplier approval workbook — and drop it in.
        </p>
        <RecordList archive={archive} search={search} setSearch={setSearch} />
      </div>
    );
  }

  const { intake } = stage;
  const chunks = intake.chunks;
  const drafted = chunks.filter((c) => c.source !== null).length;
  const held = chunks.length - drafted;
  const approved = chunks.filter((c) => c.state === "approved").length;
  const isTranscript = intake.report.route === "transcript";

  // ————— done —————
  if (stage.name === "done") {
    return (
      <>
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule)",
            borderRadius: 16,
            padding: 28,
          }}
        >
          <p style={{ ...mono, fontSize: 11, letterSpacing: "0.16em", color: SEA, marginBottom: 10 }}>
            REVIEW COMPLETE
          </p>
          <p style={{ fontSize: 15.5, color: "var(--text)", marginBottom: 6 }}>
            {approved} of {chunks.length} answers approved from{" "}
            <span style={{ ...mono, fontSize: 13.5 }}>{stage.fileName}</span>.
          </p>
          <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 20 }}>
            {isTranscript
              ? intake.report.routeReason + " Anything you left unanswered is simply absent from the transcript."
              : "The download is the buyer's own workbook with your approved answers in place — their layout, their formatting. Anything you left unanswered stays blank for them to see."}
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <label htmlFor="record-name" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Name this record
            </label>
            <input
              id="record-name"
              value={recordName}
              onChange={(e) => setRecordName(e.target.value)}
              disabled={!!savedRef}
              placeholder="e.g. Harbourline — new listing 2026"
              style={{
                flex: "1 1 260px",
                minWidth: 220,
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid var(--rule-strong)",
                borderRadius: 9,
                background: savedRef ? "var(--bg-surface)" : "#fff",
              }}
            />
            <button className="btn btn-primary" onClick={saveToRecord} disabled={!!savedRef}>
              {savedRef ? `Saved as ${savedRef} ✓` : "Save to the record"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              onClick={() => downloadCompleted(intake.writeCtx, chunks, stage.fileName)}
            >
              {isTranscript ? "Download answer transcript" : "Download completed workbook"}
            </button>
            <a
              className="btn btn-ghost"
              href={`mailto:procurement@harbourline-hotels.example?subject=${encodeURIComponent(
                "Supplier questionnaire — completed: " + stage.fileName,
              )}&body=${encodeURIComponent(
                "Please find our completed supplier questionnaire attached.\n\nKind regards\nEstuary Creamery",
              )}`}
            >
              Draft the return email
            </a>
            <button className="btn btn-ghost" onClick={() => setStage({ name: "intake" })}>
              Start another
            </button>
          </div>
        </div>
        <RecordList archive={archive} search={search} setSearch={setSearch} />
      </>
    );
  }

  // ————— review —————
  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ ...mono, fontSize: 12.5, color: "var(--text)" }}>{stage.fileName}</span>
        <span style={{ ...mono, fontSize: 11.5, color: MUTED }}>
          {chunks.length} questions · {drafted} drafted · {held} for a person · {approved} approved
        </span>
        <span style={{ flex: 1 }} />
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12.5, padding: "6px 13px" }}
          onClick={() => setStage({ name: "intake" })}
        >
          Discard
        </button>
      </div>

      <ReportCard report={intake.report} onPromote={promote} />

      <div style={{ display: "grid", gap: 10 }}>
        {chunks.map((c) => {
          const isHeld = c.source === null;
          const isApproved = c.state === "approved";
          return (
            <div
              key={c.id}
              style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${isApproved ? SEA : "var(--rule)"}`,
                borderRadius: 14,
                padding: 18,
                opacity: isApproved ? 0.82 : 1,
              }}
            >
              <p style={{ ...mono, fontSize: 10.5, color: MUTED, marginBottom: 6 }}>
                {c.sheet} · row {c.rowNumber}
                {c.transcriptOnly && !isTranscript ? " · answer goes to the transcript" : ""}
              </p>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                {c.question}
              </p>

              {c.state === "editing" ? (
                <textarea
                  autoFocus
                  defaultValue={c.answer}
                  rows={3}
                  style={{
                    width: "100%",
                    fontSize: 14,
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    padding: 10,
                    border: `1px solid ${TEAL}`,
                    borderRadius: 8,
                    background: "#fff",
                    marginBottom: 10,
                  }}
                  onBlur={(e) => update(c.id, { answer: e.target.value, state: "draft" })}
                />
              ) : c.answer ? (
                <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>{c.answer}</p>
              ) : (
                <p style={{ fontSize: 13.5, color: HONEY, marginBottom: 10 }}>
                  No controlled document covers this — a person needs to answer it.
                </p>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {c.source ? (
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      padding: "4px 9px",
                      border: "1px solid var(--rule-strong)",
                      borderRadius: 99,
                      color: MUTED,
                    }}
                  >
                    {c.source}
                  </span>
                ) : (
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      padding: "4px 9px",
                      borderRadius: 99,
                      color: HONEY,
                      border: `1px solid ${HONEY}`,
                    }}
                  >
                    Needs a person
                  </span>
                )}
                {isApproved && <span style={{ ...mono, fontSize: 11, color: SEA }}>Approved ✓</span>}
                <span style={{ flex: 1 }} />
                {!isApproved && (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 13, padding: "7px 14px" }}
                      onClick={() => update(c.id, { state: "editing" })}
                    >
                      {isHeld && !c.answer ? "Answer" : "Edit"}
                    </button>
                    {c.answer && (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 13, padding: "7px 14px" }}
                        onClick={() => update(c.id, { state: "approved" })}
                      >
                        Approve answer
                      </button>
                    )}
                  </>
                )}
                {isApproved && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 13, padding: "7px 14px" }}
                    onClick={() => update(c.id, { state: "draft" })}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          disabled={approved === 0}
          onClick={() => setStage({ ...stage, name: "done" })}
        >
          Finish review ({approved}/{chunks.length})
        </button>
        <p style={{ fontSize: 12.5, color: MUTED }}>
          Nothing sends itself — only approved answers leave the desk.
        </p>
      </div>
      <RecordList archive={archive} search={search} setSearch={setSearch} />
    </div>
  );
}

// ————— the record: every completed questionnaire, searchable —————
function RecordList({
  archive,
  search,
  setSearch,
}: {
  archive: ArchiveRow[];
  search: string;
  setSearch: (s: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const live = archive.filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.fileName.toLowerCase().includes(q),
  );
  const seeded = QUESTIONNAIRES.filter(
    (r) => !q || r.from.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
  );

  return (
    <div style={{ marginTop: 34 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: MUTED }}>
          THE RECORD
        </span>
        <span style={{ flex: 1 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the record…"
          aria-label="Search completed questionnaires"
          style={{
            width: 230,
            padding: "8px 12px",
            fontSize: 13.5,
            border: "1px solid var(--rule-strong)",
            borderRadius: 99,
            background: "var(--bg-elevated)",
          }}
        />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr>
              <th style={th}>REF</th>
              <th style={th}>NAME</th>
              <th style={th}>DATE</th>
              <th style={th}>ANSWERS</th>
              <th style={th}>FILE</th>
            </tr>
          </thead>
          <tbody>
            {live.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{r.ref}</td>
                <td style={{ ...td, fontWeight: 600, color: "var(--text)" }}>{r.name}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{r.date}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>
                  {r.approved}/{r.total}
                </td>
                <td style={td}>
                  {r.b64 ? (
                    <button
                      onClick={() => b64Download(r.b64!, r.name)}
                      style={{
                        ...mono,
                        fontSize: 12,
                        color: TEAL,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline",
                      }}
                    >
                      Download ↓
                    </button>
                  ) : (
                    <span style={{ ...mono, fontSize: 12, color: MUTED }}>{r.fileName}</span>
                  )}
                </td>
              </tr>
            ))}
            {seeded.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{r.id}</td>
                <td style={td}>{r.from}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>{r.received}</td>
                <td style={{ ...td, ...mono, fontSize: 12.5 }}>
                  {r.drafted}/{r.questions}
                </td>
                <td style={{ ...td, ...mono, fontSize: 12, color: MUTED }}>{r.state}</td>
              </tr>
            ))}
            {live.length + seeded.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...td, color: MUTED }}>
                  Nothing in the record matches "{search}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
