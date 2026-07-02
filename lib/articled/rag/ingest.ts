import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embed } from "@/lib/articled/llm/bedrock";
import { FRS_SECTIONS, FIRM_DOCS } from "@/lib/articled/kb/data";

type Chunk = {
  sourceId: string;
  kind: "frs" | "firm";
  ref: string;
  title: string;
  category: string | null;
  flag: boolean;
  content: string;
};

function buildChunks(): Chunk[] {
  const frs: Chunk[] = FRS_SECTIONS.map((s) => ({
    sourceId: `frs-${s.id}`,
    kind: "frs",
    ref: s.id,
    title: s.title,
    category: s.group,
    flag: Boolean(s.flag),
    content: `FRS 102 §${s.id} — ${s.title}\n${s.summary}`,
  }));

  const firm: Chunk[] = FIRM_DOCS.map((d) => ({
    sourceId: `firm-${d.id}`,
    kind: "firm",
    ref: d.id,
    title: d.title,
    category: d.category,
    flag: false,
    content: `${d.title}\n${d.summary}\n${d.body}`,
  }));

  return [...frs, ...firm];
}

/** Embed and upsert the whole knowledge base. Returns the number of chunks written. */
export async function ingestAll(): Promise<number> {
  const chunks = buildChunks();

  for (const c of chunks) {
    const vec = await embed(c.content);
    const literal = `[${vec.join(",")}]`;

    const row = await prisma.articledKbChunk.upsert({
      where: { sourceId: c.sourceId },
      update: {
        kind: c.kind, ref: c.ref, title: c.title,
        category: c.category, flag: c.flag, content: c.content,
      },
      create: {
        sourceId: c.sourceId, kind: c.kind, ref: c.ref, title: c.title,
        category: c.category, flag: c.flag, content: c.content,
      },
    });

    await prisma.$executeRaw(
      Prisma.sql`UPDATE "ArticledKbChunk" SET embedding = ${literal}::vector WHERE id = ${row.id}`
    );
  }

  return chunks.length;
}
