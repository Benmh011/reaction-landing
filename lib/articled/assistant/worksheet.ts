// Spreadsheet "do some work on it" engine for the web app.
//
// A model can't edit a binary .xlsx directly, so we: (1) parse the workbook into a
// cell-by-cell view, (2) ask Claude (the strong model) for a structured set of edits,
// (3) apply those edits to the ORIGINAL workbook with ExcelJS so the firm's template
// formatting is preserved, and (4) hand back the completed file. The file is processed
// in memory and never stored.

import ExcelJS from "exceljs";
import { converse } from "@/lib/articled/llm/bedrock";

const MAX_CELLS = 1500; // bound the prompt size for very large sheets

type Edit = { sheet?: string; cell: string; value: string | number | boolean };

const WORKSHEET_PROMPT = `You are an assistant to a UK accountancy trainee. You are given the full contents of a spreadsheet (cell references and current values; formulas are shown starting with "="), and an instruction describing the work to do on it.

Decide what cells to add or change to carry out the instruction, then respond.

Rules:
- Use a FORMULA (a string starting with "=") whenever a value is a calculation — totals, subtotals, cross-casts, variances — rather than hard-coding a number. Reference cells, e.g. "=SUM(B2:B9)". This keeps the workbook live and checkable.
- Never invent figures. If a number the user needs isn't derivable from the data present, leave it out and say so in your summary.
- Preserve the existing layout. Only touch the cells you need to.
- Reference the exact sheet names given, and standard A1 cell references.
- Apply UK accountancy conventions (e.g. FRS 102 presentation, debits/credits, rounding) where relevant, and flag anything that needs a manager's review.

Respond with ONLY a JSON object, no prose around it, no code fences, in exactly this shape:
{"summary":"<plain-English explanation of what you changed and any caveats>","edits":[{"sheet":"<sheet name>","cell":"<A1 ref>","value":<number, string, or "=formula">}]}

If no edits are appropriate (e.g. the user only asked a question), return an empty edits array and put the answer in summary.`;

function describeWorkbook(wb: ExcelJS.Workbook): string {
  const lines: string[] = [];
  let count = 0;
  for (const ws of wb.worksheets) {
    lines.push(`# Sheet: ${ws.name} (rows ${ws.rowCount}, cols ${ws.columnCount})`);
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (count >= MAX_CELLS) return;
        const v = cell.value as unknown;
        let repr: string;
        if (v && typeof v === "object" && "formula" in (v as object)) {
          const f = v as { formula?: string; result?: unknown };
          repr = `=${f.formula} (currently ${f.result ?? ""})`;
        } else {
          repr = String(v ?? "");
        }
        lines.push(`${cell.address}: ${repr}`);
        count++;
      });
    });
  }
  if (count >= MAX_CELLS) lines.push(`... (truncated at ${MAX_CELLS} cells)`);
  return lines.join("\n");
}

function findSheet(wb: ExcelJS.Workbook, name?: string): ExcelJS.Worksheet {
  if (name) {
    const exact = wb.getWorksheet(name);
    if (exact) return exact;
    const ci = wb.worksheets.find((w) => w.name.toLowerCase() === name.toLowerCase());
    if (ci) return ci;
  }
  return wb.worksheets[0];
}

function applyEdits(wb: ExcelJS.Workbook, edits: Edit[]): number {
  let applied = 0;
  for (const e of edits) {
    if (!e || !e.cell) continue;
    try {
      const ws = findSheet(wb, e.sheet);
      const cell = ws.getCell(e.cell);
      if (typeof e.value === "string" && e.value.startsWith("=")) {
        cell.value = { formula: e.value.slice(1) } as ExcelJS.CellFormulaValue;
      } else {
        cell.value = e.value as ExcelJS.CellValue;
      }
      applied++;
    } catch {
      // skip malformed cell references rather than failing the whole run
    }
  }
  return applied;
}

// Pull a JSON object out of the model's reply, tolerating fences or stray prose.
function parseModelJson(text: string): { summary?: string; edits?: Edit[] } {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return { summary: text, edits: [] };
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { summary: text, edits: [] };
  }
}

export async function processWorksheet(opts: {
  buffer: Buffer;
  filename: string;
  instruction: string;
}): Promise<{ summary: string; edits: number; filename: string; fileBuffer: Buffer }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(opts.buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const description = describeWorkbook(wb);

  const userText = `Spreadsheet "${opts.filename}" current contents:\n\n${description}\n\nInstruction:\n${
    opts.instruction || "Complete the spreadsheet."
  }`;

  const { text } = await converse({
    system: WORKSHEET_PROMPT,
    messages: [{ role: "user", content: [{ text: userText }] }],
    modelId: process.env.BEDROCK_MODEL_ID, // the strong model
    maxTokens: 4000,
    temperature: 0,
  });

  const parsed = parseModelJson(text);
  const edits = Array.isArray(parsed.edits) ? parsed.edits : [];
  const applied = applyEdits(wb, edits);

  const outBuf = Buffer.from(await wb.xlsx.writeBuffer());
  return {
    summary: parsed.summary ?? text,
    edits: applied,
    filename: `completed-${opts.filename}`,
    fileBuffer: outBuf,
  };
}
