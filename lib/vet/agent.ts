import {
  searchClinical,
  searchMedications,
  searchLegislation,
  searchPracticeRecords,
} from "./retrieval";
import { defaultProvider } from "./providers";
import { fetchSpcText, parseSpcSections, parseWithdrawalValues } from "./spc";
import { prisma } from "./db";
import type { ChatMessage, GenerateInput, GenerateOutput, ModelProvider, ToolDef } from "./providers";
import type { Site } from "@prisma-vet/client";

// ---------------------------------------------------------------------------
// System prompt. This is the safety spine of the whole system — it constrains
// how the model is allowed to use the retrieved evidence. Edit with care.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a clinical and operational decision-support assistant for Southmoor Vets, a mixed practice operating across Kingsbridge, Dartington and Ivybridge. Your users are RCVS-registered veterinary surgeons and nurses.

Operating rules — these are not optional:

1. GROUND EVERYTHING. Answer only from the evidence returned by your tools. After answering, list the sources you used. If the tools return nothing relevant, say so plainly — do not fill the gap from general knowledge presented as fact. NEVER write a specific dose, withdrawal period, or distribution category (POM-V etc.) that you did not actually retrieve from a tool result — if you did not retrieve the figure, do not state a number, even if you think you know it. A wrong withdrawal period is a food-safety hazard.

2. NEVER FABRICATE A DOSE. State a dose, route or treatment duration only if it appears in retrieved Summary of Product Characteristics (SPC) / datasheet text. To obtain a dose or withdrawal period for an authorised product: first locate the product with search_medications, then call fetch_spc on that product's SPC link to read the authorised SPC, and quote only figures that actually appear in it. If a dose or withdrawal period is not in the retrieved evidence, say so plainly and point the vet to the product's VMD entry. Prefer products that search_medications marks "spcFetchable": true, because those are the ones whose SPC you can actually read and verify. If fetch_spc returns "spcRetrieved": false (or otherwise gives you no spcText) for a product, you have NOT read its SPC — you must not state that product's dose, withdrawal period or distribution category at all; name it only as an option and tell the vet to consult its SPC directly. When you present several products, the reader cannot tell verified figures from guessed ones, so only tabulate figures you actually retrieved. When fetch_spc succeeds it returns the "withdrawalPeriod" and "dosage" sections quoted verbatim from the SPC — use that exact wording for withdrawal periods and doses; do not round, summarise or restate the numbers in your own way.

3. FOOD-PRODUCING SPECIES — ALWAYS surface the withdrawal periods (meat, milk, eggs, honey as applicable) for any medication you mention. This is a public-health requirement. If a withdrawal period is unknown from the evidence, flag that explicitly.

4. Always state a medication's distribution category (POM-V, POM-VPS, NFA-VPS, AVM-GSL) and the species it is authorised for. Note where the prescribing cascade is relevant (e.g. when no authorised product exists for the species/condition).

5. RECORDS ARE CONFIDENTIAL. Use the practice-records tool only for the client/animal in scope, and never surface one client's records when answering about another.

6. YOU ARE DECISION SUPPORT, NOT THE PRESCRIBER. The attending veterinary surgeon holds clinical and legal responsibility for every decision. Do NOT volunteer a treatment plan, drug choice, dose or course of action unless the user explicitly asks for treatment options or what to do. If the user only asks for information, a differential, a patient summary or a case history, give exactly that and stop — you may add one short closing line offering to advise on management if they would like it, but do not push a course of action they did not ask for. When the user does ask for management, present evidence and options rather than issuing directives, and briefly remind them the decision rests with the attending vet.

7. ANTIMICROBIAL STEWARDSHIP. When recommending antibiotics, list first-line agents first. Reserve highest-priority critically important antimicrobials (HP-CIAs) — fluoroquinolones and 3rd/4th-generation cephalosporins such as ceftiofur (EMA Category B, "restrict") — for cases where first-line options have failed or culture and sensitivity testing justifies them. Never present an HP-CIA as the headline or default choice for a routine first presentation; if you mention one, flag its restricted status and the preference for culture/sensitivity. Also flag explicitly where a product's authorised indication does not cover the condition presented (i.e. off-label / cascade use), rather than implying it is a licensed indication.

8. CITE INLINE, WITH LINKS. Immediately after any statement that a specific medicine, dose, withdrawal period, distribution category, prescribing action or legal/regulatory requirement can or should be used, attach a citation as a Markdown link to the exact source you retrieved it from. Use the medicine's SPC link (the "spcUrl") for any drug/dose/withdrawal/category fact, and the "sourceUrl" of the clinical or legislation result for clinical or legal facts — both fields appear in your tool results. Keep the link TEXT to a short source label in square brackets, e.g. [SPC], [VMD], [VMR 2013], [Misuse of Drugs Regs], [GOV.UK], [RCVS]. Place each link right after the sentence (or inside the relevant table cell) it supports, not only in a list at the end. CRITICAL: only ever link to a URL string that actually appears in your retrieved tool results — never invent, guess, complete or modify a URL. If you have no retrieved URL for a particular claim, cite the source by name in plain text with no link. You may still finish with a short "Sources" list as well.

WORKING METHOD — be decisive, do not loop:
- search_medications matches on product NAME, active SUBSTANCE and therapeutic group — it does NOT match on clinical indication. So search by the drug or substance you are considering, never by the disease or symptom. Searching a disease phrase returns the wrong thing: e.g. "respiratory disease in calves" returns VACCINES, not the antibiotics that treat an active infection.
- Worked example — a calf with suspected bacterial respiratory disease: decide the drug class first (an antibiotic), then search_medications "florfenicol", then "oxytetracycline" or "doxycycline" — NOT "respiratory disease". Then fetch_spc a product whose result shows "spcFetchable": true and ground your figures in it.
- For a treatment question: use your veterinary knowledge to decide which drug(s) or class fit the condition, search_medications for one or two of them by name, then call fetch_spc on a chosen authorised product to read its real dose and withdrawal periods, then answer. Name reasonable alternatives in prose without searching every one.
- VACCINES (therapeuticGroup contains "Vaccine") PREVENT disease; they are NOT a treatment for an animal that is already sick. Never offer a vaccine as the treatment for an active clinical case — at most mention it separately as prevention.
- Do not repeat the same or a similar search. Once you have candidate products, move on to fetch_spc or to answering. If searches return nothing usable, say so plainly rather than searching again.
- Write for the vet, not about your own process. Never mention your tools (search_medications, fetch_spc, etc.) in the answer; just give the clinical answer and cite the SPC/source by name.

Be concise and practical. Vets are time-poor.`;

// Tool schemas — normalized (JSON Schema in `parameters`). Each provider
// renders these into its own format (Anthropic input_schema / OpenAI function).
export const TOOLS: ToolDef[] = [
  {
    name: "search_clinical",
    description:
      "Search clinical knowledge for symptoms, differential diagnoses and treatment protocols across any species. Use for 'what could cause X' / 'how is Y managed' questions.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        species: { type: "string", description: "e.g. cattle, sheep, equine, canine" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_medications",
    description:
      "Search authorised UK veterinary medicines (VMD data). Returns regulated facts: distribution category, target species, active substances, therapeutic group, and the SPC link. Use whenever a medicine or treatment product is in question. NOTE: this returns metadata + an spcUrl, not the dose/withdrawal text — call fetch_spc on the spcUrl for those.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "product name, active substance, therapeutic group, or indication" },
        species: { type: "string" },
        distributionCat: { type: "string", enum: ["POM-V", "POM-VPS", "NFA-VPS", "AVM-GSL"] },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_spc",
    description:
      "Fetch and read a specific medicine's Summary of Product Characteristics (SPC) live from the VMD. Use AFTER search_medications has found the product, to get the real dose, withdrawal periods, indications and contraindications. Pass the spcUrl returned by search_medications (or the product's vmNo).",
    parameters: {
      type: "object",
      properties: {
        spcUrl: { type: "string", description: "the SPC link from a search_medications result" },
        vmNo: { type: "string", description: "alternatively, the product's vmNo" },
      },
    },
  },
  {
    name: "search_legislation",
    description:
      "Search UK veterinary legislation and the RCVS Code of Professional Conduct. Use for questions about what is legally required/permitted (controlled drugs, the cascade, record-keeping, welfare, disease reporting).",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "search_practice_records",
    description:
      "Search Southmoor's own ingested client/patient records. Always scoped to the caller's site; pass clientRef/animalRef to narrow to a specific client or animal.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        clientRef: { type: "string" },
        animalRef: { type: "string" },
      },
      required: ["query"],
    },
  },
];

interface AgentContext {
  site: Site;
}

async function runTool(name: string, input: any, ctx: AgentContext) {
  try {
    switch (name) {
      case "search_clinical":
        if (!input?.query) return { error: "search_clinical requires a 'query' string" };
        return await searchClinical(input.query, input.species);
      case "search_medications":
        if (!input?.query) return { error: "search_medications requires a 'query' string" };
        return await searchMedications(input);
      case "search_legislation":
        if (!input?.query) return { error: "search_legislation requires a 'query' string" };
        return await searchLegislation(input.query);
      case "search_practice_records":
        if (!input?.query) return { error: "search_practice_records requires a 'query' string" };
        return await searchPracticeRecords({ ...input, site: ctx.site });
      case "fetch_spc": {
        const vmNo = input?.vmNo ? String(input.vmNo) : undefined;
        const med = vmNo
          ? await prisma.medication.findUnique({ where: { vmNo } })
          : null;
        const url: string | undefined = input?.spcUrl ?? med?.spcUrl ?? undefined;
        if (!url) {
          return {
            spcRetrieved: false,
            reason: "No SPC link is on record for this product.",
            instruction:
              "Do NOT state any dose, withdrawal period or distribution category for this product. Direct the vet to its VMD/EMA entry.",
          };
        }
        let host = "";
        try {
          host = new URL(url).hostname;
        } catch {}
        if (host !== "www.vmd.defra.gov.uk") {
          // Centrally (EMA) authorised products carry a generic EMA link, not a
          // fetchable GB SPC. The GB SPC (the one that governs a GB practice) is
          // on the VMD PID; the EMA link is the Northern Ireland / EU route.
          return {
            spcRetrieved: false,
            spcUrl: url,
            reason:
              "This is an EMA centrally-authorised product; the link is the EU/Northern Ireland SPC, not a fetchable GB SPC, so no GB SPC text could be retrieved here.",
            instruction:
              "Do NOT state any dose, withdrawal period or distribution category for THIS product — you have not read its GB SPC. You may name it as an option, but tell the vet the GB SPC is on the VMD Product Information Database (and the EU/Northern Ireland SPC is on the EMA Union Product Database).",
          };
        }
        // Serve from cache if we've already read this SPC; otherwise fetch once
        // and cache the text + parsed withdrawal values.
        let text = med?.spcText ?? "";
        if (!text) {
          text = await fetchSpcText(url);
          if (text && med?.id) {
            const parsed = parseSpcSections(text);
            await prisma.medication
              .update({
                where: { id: med.id },
                data: {
                  spcText: text.slice(0, 100000),
                  withdrawalPeriods: (parseWithdrawalValues(parsed.withdrawal) ??
                    undefined) as any,
                },
              })
              .catch(() => {});
          }
        }
        if (!text || text.length < 50) {
          return {
            spcRetrieved: false,
            spcUrl: url,
            reason: "The SPC link was reachable but no readable text could be extracted.",
            instruction:
              "Do NOT state any dose or withdrawal period for this product; tell the vet to open the SPC link directly.",
          };
        }
        const sections = parseSpcSections(text);
        return {
          spcRetrieved: true,
          spcUrl: url,
          // Safety-critical passages, quoted verbatim from the SPC.
          withdrawalPeriod: sections.withdrawal,
          dosage: sections.dosage,
          spcText: text.slice(0, 12000),
        };
      }
      default:
        return { error: `unknown tool ${name}` };
    }
  } catch (e: any) {
    // A bad tool call must never crash the run — hand the error back so the
    // model can recover or report it cleanly.
    return { error: `tool ${name} failed: ${e?.message ?? String(e)}` };
  }
}

export interface AgentResult {
  answer: string;
  toolCalls: { name: string; input: unknown }[];
  sourcesUsed: unknown[];
  // Telemetry — used by the bake-off harness and (later) the dashboard.
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  latencyMs: number;
}

export interface RunAgentOptions {
  provider?: ModelProvider; // defaults to Claude on Bedrock (production)
  maxTurns?: number;
}

/** Run the agent loop: model reasons, calls tools, we feed results back,
 *  repeat until it produces a final answer. Model-agnostic via the provider. */
export async function runAgent(
  question: string,
  ctx: AgentContext,
  opts: RunAgentOptions = {},
): Promise<AgentResult> {
  const provider = opts.provider ?? defaultProvider();
  const maxTurns = opts.maxTurns ?? 8;

  const messages: ChatMessage[] = [{ role: "user", content: question }];
  const toolCalls: { name: string; input: unknown }[] = [];
  const sourcesUsed: unknown[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let searchCount = 0;
  let grounded = false; // true once at least one tool has actually executed
  const started = Date.now();

  for (let turn = 0; turn < maxTurns; turn++) {
    // Once the model has searched enough, take the search tools away entirely so
    // a weaker model cannot keep looping — it must fetch_spc or give its answer.
    const toolsForTurn =
      searchCount >= 4 ? TOOLS.filter((t) => !t.name.startsWith("search_")) : TOOLS;
    const out = await provider.generate({
      system: SYSTEM_PROMPT,
      tools: toolsForTurn,
      messages,
      maxTokens: 1500,
      // Until the model has actually used a tool, force it to call one. This is
      // the structural guarantee that it cannot answer a clinical question from
      // memory — every answer must be grounded in retrieved evidence.
      toolChoice: grounded ? "auto" : "required",
    });
    inputTokens += out.usage.inputTokens;
    outputTokens += out.usage.outputTokens;

    // No tool calls => either a grounded final answer, or (if nothing has been
    // grounded yet) the model trying to answer from memory — which we reject.
    if (!out.toolCalls.length) {
      if (!grounded) {
        messages.push({ role: "assistant", content: out.text, toolCalls: [] });
        messages.push({
          role: "user",
          content:
            "Do NOT answer from memory. You have not retrieved any evidence yet. " +
            "You must first call search_medications (by drug/substance name) and/or search_clinical, " +
            "then fetch_spc to read the SPC, before giving any dose or withdrawal period. Call a search tool now.",
        });
        continue;
      }
      return {
        answer: out.text,
        toolCalls,
        sourcesUsed,
        usage: { inputTokens, outputTokens },
        model: provider.model,
        latencyMs: Date.now() - started,
      };
    }

    // Record the assistant turn (text + the tool calls it requested).
    messages.push({ role: "assistant", content: out.text, toolCalls: out.toolCalls });

    // Execute each tool and feed results back as tool messages.
    for (const call of out.toolCalls) {
      toolCalls.push({ name: call.name, input: call.args });
      const isSearch = call.name.startsWith("search_");
      let result: unknown;
      if (isSearch && searchCount >= 4) {
        // Convergence guard: a weaker model will loop on search forever.
        // After enough searching, refuse further searches and force progress.
        result = {
          note:
            "You have searched enough. Do not call any search tool again. " +
            "Either call fetch_spc on the most relevant product's spcUrl to read its SPC, " +
            "or give your final answer now using the evidence already gathered " +
            "(and say plainly if that evidence is insufficient to give doses/withdrawals).",
        };
      } else {
        if (isSearch) searchCount++;
        result = await runTool(call.name, call.args, ctx);
      }
      sourcesUsed.push(result);
      messages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify(result).slice(0, 12000),
      });
    }
    grounded = true; // at least one tool has now run
  }

  // Out of tool steps — force one final answer from the evidence already
  // gathered, rather than failing with a stall.
  const finalMessages: ChatMessage[] = [
    ...messages,
    {
      role: "user",
      content:
        "You have run out of tool steps. Give your final answer NOW using ONLY the evidence already gathered above. " +
        "Do NOT state any dose, withdrawal period or distribution category that did not appear in retrieved SPC/VMD evidence — if you did not retrieve a figure, do not write that figure. " +
        "If the evidence is insufficient, say so plainly, you may name candidate drug classes in general terms only, and tell the vet to confirm the authorised product, dose and withdrawal periods on the product's VMD SPC.",
    },
  ];
  const finalOut = await provider.generate({
    system: SYSTEM_PROMPT,
    tools: [],
    messages: finalMessages,
    maxTokens: 1500,
  });
  inputTokens += finalOut.usage.inputTokens;
  outputTokens += finalOut.usage.outputTokens;

  return {
    answer:
      finalOut.text?.trim() ||
      "I could not retrieve enough evidence to answer safely. Please narrow the question or check the product directly on the VMD database.",
    toolCalls,
    sourcesUsed,
    usage: { inputTokens, outputTokens },
    model: provider.model,
    latencyMs: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// Streaming variant. Same loop, same grounding guarantees — but it emits
// events so the UI can show live status ("Searching…", "Reading the SPC…") and
// stream the final answer token-by-token. Falls back to non-streaming generate
// transparently if the provider has no generateStream.
// ---------------------------------------------------------------------------
export type AgentEvent =
  | { type: "status"; tool: string }
  | { type: "delta"; text: string }
  | { type: "reset" };

export async function runAgentStream(
  question: string,
  ctx: AgentContext,
  emit: (e: AgentEvent) => void,
  opts: RunAgentOptions = {},
): Promise<AgentResult> {
  const provider = opts.provider ?? defaultProvider();
  const maxTurns = opts.maxTurns ?? 8;
  const handlers = {
    onDelta: (t: string) => emit({ type: "delta", text: t }),
    onResetText: () => emit({ type: "reset" }),
  };
  const gen = (input: GenerateInput): Promise<GenerateOutput> =>
    provider.generateStream ? provider.generateStream(input, handlers) : provider.generate(input);

  const messages: ChatMessage[] = [{ role: "user", content: question }];
  const toolCalls: { name: string; input: unknown }[] = [];
  const sourcesUsed: unknown[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let searchCount = 0;
  let grounded = false;
  const started = Date.now();

  for (let turn = 0; turn < maxTurns; turn++) {
    const toolsForTurn =
      searchCount >= 4 ? TOOLS.filter((t) => !t.name.startsWith("search_")) : TOOLS;
    const out = await gen({
      system: SYSTEM_PROMPT,
      tools: toolsForTurn,
      messages,
      maxTokens: 1500,
      toolChoice: grounded ? "auto" : "required",
    });
    inputTokens += out.usage.inputTokens;
    outputTokens += out.usage.outputTokens;

    if (!out.toolCalls.length) {
      if (!grounded) {
        // Model tried to answer from memory; discard any streamed text and force a search.
        emit({ type: "reset" });
        messages.push({ role: "assistant", content: out.text, toolCalls: [] });
        messages.push({
          role: "user",
          content:
            "Do NOT answer from memory. You have not retrieved any evidence yet. " +
            "You must first call search_medications (by drug/substance name) and/or search_clinical, " +
            "then fetch_spc to read the SPC, before giving any dose or withdrawal period. Call a search tool now.",
        });
        continue;
      }
      return {
        answer: out.text,
        toolCalls,
        sourcesUsed,
        usage: { inputTokens, outputTokens },
        model: provider.model,
        latencyMs: Date.now() - started,
      };
    }

    messages.push({ role: "assistant", content: out.text, toolCalls: out.toolCalls });
    for (const call of out.toolCalls) {
      toolCalls.push({ name: call.name, input: call.args });
      emit({ type: "status", tool: call.name });
      const isSearch = call.name.startsWith("search_");
      let result: unknown;
      if (isSearch && searchCount >= 4) {
        result = {
          note:
            "You have searched enough. Do not call any search tool again. " +
            "Either call fetch_spc on the most relevant product's spcUrl to read its SPC, " +
            "or give your final answer now using the evidence already gathered " +
            "(and say plainly if that evidence is insufficient to give doses/withdrawals).",
        };
      } else {
        if (isSearch) searchCount++;
        result = await runTool(call.name, call.args, ctx);
      }
      sourcesUsed.push(result);
      messages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify(result).slice(0, 12000),
      });
    }
    grounded = true;
  }

  emit({ type: "reset" });
  const finalMessages: ChatMessage[] = [
    ...messages,
    {
      role: "user",
      content:
        "You have run out of tool steps. Give your final answer NOW using ONLY the evidence already gathered above. " +
        "Do NOT state any dose, withdrawal period or distribution category that did not appear in retrieved SPC/VMD evidence — if you did not retrieve a figure, do not write that figure. " +
        "If the evidence is insufficient, say so plainly, you may name candidate drug classes in general terms only, and tell the vet to confirm the authorised product, dose and withdrawal periods on the product's VMD SPC.",
    },
  ];
  const finalOut = await gen({ system: SYSTEM_PROMPT, tools: [], messages: finalMessages, maxTokens: 1500 });
  inputTokens += finalOut.usage.inputTokens;
  outputTokens += finalOut.usage.outputTokens;

  return {
    answer:
      finalOut.text?.trim() ||
      "I could not retrieve enough evidence to answer safely. Please narrow the question or check the product directly on the VMD database.",
    toolCalls,
    sourcesUsed,
    usage: { inputTokens, outputTokens },
    model: provider.model,
    latencyMs: Date.now() - started,
  };
}
