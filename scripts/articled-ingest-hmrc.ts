/**
 * HMRC manual ingestion (one-off / periodic refresh).
 *
 * Pulls selected HMRC internal manuals from the GOV.UK Content API (Open Government
 * Licence — reuse with attribution), strips the HTML to text, embeds with Titan, and
 * upserts into the same KbChunk table the FRS/firm content lives in, tagged kind="hmrc".
 *
 * It's a standalone script (not a serverless route) because a single manual can have
 * thousands of sections — far beyond a 60s function. Run it locally where you can reach
 * gov.uk, with these env vars set (same values as Vercel):
 *   DATABASE_URL                 (your Neon connection string)
 *   AWS_REGION                   (eu-central-1)
 *   AWS_BEARER_TOKEN_BEDROCK     (your Bedrock key)
 *   BEDROCK_EMBED_MODEL_ID       (amazon.titan-embed-text-v2:0)
 *
 * Run:  set -a; source .env.local; set +a; npx tsx scripts/ingest-hmrc.ts
 *
 * NOTE: the Content API field names below (child_section_groups -> child_sections ->
 * section_id, and details.body for the section text) reflect the documented manual
 * shape. If the first run logs "0 sections" for a manual, log one raw response and we'll
 * adjust the two field paths — everything else stays the same.
 */

import { PrismaClient } from "@prisma/client";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { randomUUID } from "node:crypto";

// --- Which manuals to ingest. Each maps to one of your firm's tax areas. ---
// Start with ONE smaller manual to validate the pipeline and gauge token cost before
// running the big ones (capital-gains, employment-income and business-income are huge).
const MANUALS: { slug: string; area: string }[] = [
  { slug: "capital-allowances-manual", area: "Capital allowances" },
  { slug: "self-assessment-manual", area: "Self assessment" },
  { slug: "company-taxation-manual", area: "Company tax" },
  { slug: "paye-manual", area: "PAYE" },
  { slug: "employment-income-manual", area: "PAYE / benefits in kind" }, // also covers BIK
  { slug: "capital-gains-manual", area: "Capital gains tax" },
  { slug: "trusts-settlements-and-estates-manual", area: "Trusts" },
  { slug: "business-income-manual", area: "Trading income" },
];

const API = "https://www.gov.uk/api/content/hmrc-internal-manuals";
const CHUNK_CHARS = 1200; // ~300 tokens; sections are usually one chunk
const CHUNK_OVERLAP = 150;
const MAX_SECTIONS_PER_MANUAL = 0; // 0 = no cap; set e.g. 50 for a test run
const SLEEP_MS = 60; // be polite to gov.uk

const prisma = new PrismaClient();
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- HTML -> text (good enough for grounding; not pixel-perfect formatting) ---
function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/tr)\s*>/gi, "\n")
    .replace(/<\s*(li)\s*>/gi, "\n• ")
    .replace(/<\/td>\s*<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&pound;/gi, "£")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text];
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + CHUNK_CHARS));
    i += CHUNK_CHARS - CHUNK_OVERLAP;
  }
  return out;
}

async function embed(text: string): Promise<number[]> {
  const cmd = new InvokeModelCommand({
    modelId: process.env.BEDROCK_EMBED_MODEL_ID ?? "amazon.titan-embed-text-v2:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: text, dimensions: 1024, normalize: true }),
  });
  const res = await bedrock.send(cmd);
  const json = JSON.parse(new TextDecoder().decode(res.body));
  return json.embedding as number[];
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

// Pull the flat list of {section_id, title} for a manual.
function listSections(manual: any): { section_id: string; title: string }[] {
  const groups = manual?.details?.child_section_groups ?? [];
  const out: { section_id: string; title: string }[] = [];
  for (const g of groups) {
    for (const s of g.child_sections ?? []) {
      if (s.section_id) out.push({ section_id: s.section_id, title: s.title ?? s.section_id });
    }
  }
  return out;
}

async function upsertChunk(args: {
  sourceId: string;
  ref: string;
  title: string;
  slug: string;
  content: string;
}) {
  const vec = await embed(args.content);
  const literal = `[${vec.join(",")}]`;
  await prisma.$executeRaw`
    INSERT INTO "ArticledKbChunk" (id, "sourceId", kind, ref, title, category, flag, content, embedding, "createdAt")
    VALUES (${randomUUID()}, ${args.sourceId}, 'hmrc', ${args.ref}, ${args.title}, ${args.slug}, false, ${args.content}, ${literal}::vector, now())
    ON CONFLICT ("sourceId") DO UPDATE
      SET title = EXCLUDED.title, category = EXCLUDED.category,
          content = EXCLUDED.content, embedding = EXCLUDED.embedding
  `;
}

async function ingestManual(slug: string, area: string): Promise<number> {
  console.log(`\n=== ${slug} (${area}) ===`);
  const manual = await getJson(`${API}/${slug}`);
  let sections = listSections(manual);
  if (MAX_SECTIONS_PER_MANUAL > 0) sections = sections.slice(0, MAX_SECTIONS_PER_MANUAL);
  console.log(`  ${sections.length} sections`);

  let written = 0;
  for (let n = 0; n < sections.length; n++) {
    const { section_id, title } = sections[n];
    try {
      const sec = await getJson(`${API}/${slug}/${section_id}`);
      const body = htmlToText(sec?.details?.body ?? "");
      if (body.length < 50) continue; // skip empty/contents-only pages

      const ref = section_id.toUpperCase();
      const chunks = chunkText(body);
      for (let c = 0; c < chunks.length; c++) {
        const sourceId = chunks.length > 1 ? `hmrc:${section_id}#${c}` : `hmrc:${section_id}`;
        const partTitle = chunks.length > 1 ? `${title} (part ${c + 1})` : title;
        await upsertChunk({ sourceId, ref, title: partTitle, slug, content: chunks[c] });
        written++;
      }
    } catch (e) {
      console.warn(`  ! ${section_id}: ${(e as Error).message}`);
    }
    if (n % 50 === 0 && n > 0) console.log(`  ...${n}/${sections.length}`);
    await sleep(SLEEP_MS);
  }
  console.log(`  done: ${written} chunks written`);
  return written;
}

async function main() {
  let total = 0;
  for (const m of MANUALS) {
    total += await ingestManual(m.slug, m.area);
  }
  console.log(`\nAll done. ${total} HMRC chunks ingested.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
