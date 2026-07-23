"use client";

import { useCallback, useRef, useState } from "react";
import { ANSWER_BANK } from "./data";

// ————————————————————————————————————————————————————————————————
// The questionnaire desk — the working piece of the demo.
//
// A trade questionnaire arrives as an email attachment: someone's own
// Excel workbook, their layout, their phrasing. Drop it here and the
// desk extracts the questions, drafts what it can stand behind from the
// controlled-document answer bank, and queues the rest for a person.
// Approve the drafts, answer the held ones, and download the buyer's
// own workbook back with the answers written in — formatting intact,
// because exceljs edits the original file rather than rebuilding it.
//
// Drafting here is deterministic keyword matching against ANSWER_BANK:
// predictable by design, and honest when it doesn't know. In production
// the same desk drafts from the client's real document corpus.
// ————————————————————————————————————————————————————————————————

const TEAL = "#0e5560";
const DEEP = "#0d3f47";
const SEA = "#167a5b";
const HONEY = "#a3772a";
const RASP = "#c22f4e";
const MUTED = "#77705f";

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

type Chunk = {
  id: number;
  sheet: string;
  rowNumber: number;
  answerCol: number;
  question: string;
  answer: string;
  source: string | null; // null = no bank match, needs a person
  state: "draft" | "approved" | "editing";
};

type Stage =
  | { name: "intake"; error?: string }
  | { name: "parsing"; fileName: string }
  | { name: "review"; fileName: string; fileBuf: ArrayBuffer; chunks: Chunk[] }
  | { name: "done"; fileName: string; fileBuf: ArrayBuffer; chunks: Chunk[] };

// ————— extraction heuristics —————

const looksLikeQuestion = (t: string) => {
  const s = t.trim();
  if (s.length < 12 || s.length > 400) return false;
  if (/^(question|answer|ref|section|no\.?|item)$/i.test(s)) return false;
  return s.includes("?") || /^\d+(\.\d+)*[.):\-—]\s/.test(s);
};

// a cell like "1.2" or "2.4" — the ref column of a questionnaire row.
// Imperative questions ("Describe your…") carry no question mark; the ref
// cell beside them is what identifies the row, and testing for imperative
// verbs alone would catch instruction rows ("Please complete in full…").
const isRefCell = (v: unknown) =>
  (typeof v === "string" && /^\d+(\.\d+)+\s*$/.test(v.trim())) ||
  (typeof v === "number" && v > 0 && v < 1000 && !Number.isInteger(v));

const scoreAgainstBank = (q: string) => {
  const low = q.toLowerCase();
  let best: { score: number; entry: (typeof ANSWER_BANK)[number] } | null = null;
  for (const entry of ANSWER_BANK) {
    const score = entry.keywords.filter((k) => low.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { score, entry };
  }
  return best && best.score >= 1 && (best.score >= 2 || best.entry.keywords.some((k) => k.length >= 5 && low.includes(k)))
    ? best.entry
    : null;
};

async function extractChunks(buf: ArrayBuffer): Promise<Chunk[]> {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const chunks: Chunk[] = [];
  let id = 0;

  wb.eachSheet((ws) => {
    ws.eachRow((row, rowNumber) => {
      let qCol = 0;
      let qText = "";
      let hasRef = false;
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const v = cell.value;
        if (isRefCell(v)) hasRef = true;
        const text =
          typeof v === "string"
            ? v
            : v && typeof v === "object" && "richText" in (v as object)
              ? (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("")
              : "";
        if (text && text.trim().length >= 12 && text.length > qText.length) {
          qText = text.trim();
          qCol = Number(col);
        }
      });
      // a row qualifies if its longest text reads as a question, or the row
      // carries a ref cell (1.2, 2.4…) — the layout every supplier pack uses
      if (!qCol || !(looksLikeQuestion(qText) || (hasRef && qText.length >= 12))) return;

      // answers land in the first empty cell to the right of the question
      let answerCol = qCol + 1;
      while (row.getCell(answerCol).value != null && answerCol < qCol + 6) answerCol += 1;

      const hit = scoreAgainstBank(qText);
      chunks.push({
        id: id++,
        sheet: ws.name,
        rowNumber,
        answerCol,
        question: qText,
        answer: hit ? hit.answer : "",
        source: hit ? hit.source : null,
        state: "draft",
      });
    });
  });
  return chunks;
}

async function writeBack(buf: ArrayBuffer, chunks: Chunk[], fileName: string) {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  for (const c of chunks) {
    if (c.state !== "approved" || !c.answer.trim()) continue;
    const ws = wb.getWorksheet(c.sheet);
    if (!ws) continue;
    const cell = ws.getRow(c.rowNumber).getCell(c.answerCol);
    cell.value = c.answer;
    cell.alignment = { wrapText: true, vertical: "top" };
  }
  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName.replace(/\.xlsx?$/i, "") + " — completed.xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ————— the desk —————

export default function QuestionnaireDesk() {
  const [stage, setStage] = useState<Stage>({ name: "intake" });
  const inputRef = useRef<HTMLInputElement>(null);

  const takeFile = useCallback(async (file: File) => {
    if (!/\.xlsx?$/i.test(file.name)) {
      setStage({ name: "intake", error: "That isn't an Excel workbook — questionnaires arrive as .xlsx files." });
      return;
    }
    setStage({ name: "parsing", fileName: file.name });
    try {
      const buf = await file.arrayBuffer();
      const chunks = await extractChunks(buf);
      if (chunks.length === 0) {
        setStage({ name: "intake", error: "No questions found in that workbook. Try the sample file to see the desk working." });
        return;
      }
      setStage({ name: "review", fileName: file.name, fileBuf: buf, chunks });
    } catch {
      setStage({ name: "intake", error: "Couldn't read that workbook. Try the sample file to see the desk working." });
    }
  }, []);

  const update = (id: number, patch: Partial<Chunk>) =>
    setStage((s) =>
      s.name === "review" ? { ...s, chunks: s.chunks.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : s,
    );

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
            {parsing ? "READING THE WORKBOOK…" : "A QUESTIONNAIRE ARRIVES"}
          </p>
          <p style={{ fontSize: 15, color: "var(--text)", marginBottom: 6 }}>
            {parsing
              ? stage.fileName
              : "Drop the buyer's workbook here, exactly as it landed in the inbox."}
          </p>
          {!parsing && (
            <p style={{ fontSize: 13, color: MUTED }}>
              The desk extracts the questions, drafts what your documents can
              stand behind, and queues the rest for a person.
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
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
      </div>
    );
  }

  // ————— shared counts —————
  const chunks = stage.chunks;
  const drafted = chunks.filter((c) => c.source !== null).length;
  const held = chunks.length - drafted;
  const approved = chunks.filter((c) => c.state === "approved").length;

  // ————— done —————
  if (stage.name === "done") {
    return (
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
          {approved} of {chunks.length} answers approved and written back into{" "}
          <span style={{ ...mono, fontSize: 13.5 }}>{stage.fileName}</span>.
        </p>
        <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 20 }}>
          The download is the buyer's own workbook with your approved answers in
          place — their layout, their formatting. Anything you left unanswered
          stays blank for them to see.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() => writeBack(stage.fileBuf, chunks, stage.fileName)}
          >
            Download completed workbook
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
    );
  }

  // ————— review —————
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "baseline",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
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
                {isApproved && (
                  <span style={{ ...mono, fontSize: 11, color: SEA }}>Approved ✓</span>
                )}
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

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-primary"
          disabled={approved === 0}
          onClick={() => setStage({ ...stage, name: "done" })}
        >
          Finish review ({approved}/{chunks.length})
        </button>
        <p style={{ fontSize: 12.5, color: MUTED }}>
          Nothing sends itself — only approved answers are written back.
        </p>
      </div>
    </div>
  );
}
