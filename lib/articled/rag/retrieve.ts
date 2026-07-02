import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embed } from "@/lib/articled/llm/bedrock";

export type Source = {
  kind: string; // "frs" | "firm" | "hmrc"
  ref: string; // "20" | "aml-takeon" | "CG12345"
  title: string;
  category: string | null; // for hmrc: the manual slug, used to build the gov.uk link
  content: string;
  score: number;
};

const DEFAULT_K = Number(process.env.RAG_TOP_K ?? 6);
// Minimum cosine similarity for a chunk to count as genuinely relevant. Vector search
// always returns the k nearest chunks even when nothing in the KB matches (that's how
// unrelated sources ended up cited under an unrelated answer). Below this score a chunk
// is noise, so we drop it — the model then visibly answers from general knowledge and
// no misleading source chips are shown. Tune via RAG_MIN_SCORE if it's too strict/lax.
const MIN_SCORE = Number(process.env.RAG_MIN_SCORE ?? 0.35);

export async function retrieve(query: string, k = DEFAULT_K): Promise<Source[]> {
  const vec = await embed(query);
  const literal = `[${vec.join(",")}]`;

  const rows = (await prisma.$queryRaw<Source[]>(Prisma.sql`
    SELECT kind, ref, title, category, content,
           1 - (embedding <=> ${literal}::vector) AS score
    FROM "ArticledKbChunk"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${k}
  `)).filter((r) => r.score >= MIN_SCORE);

  // Safety boost: if the user named a specific section (e.g. "§20" / "section 1A")
  // and it didn't surface, pull it in so the answer is anchored to the right section.
  const m = query.match(/(?:§|section)\s*(\d+[a-z]?)/i);
  if (m) {
    const ref = m[1].toUpperCase();
    if (!rows.some((r) => r.kind === "frs" && r.ref.toUpperCase() === ref)) {
      const extra = await prisma.$queryRaw<Source[]>(Prisma.sql`
        SELECT kind, ref, title, category, content, 1.0 AS score
        FROM "ArticledKbChunk"
        WHERE kind = 'frs' AND upper(ref) = ${ref}
        LIMIT 1
      `);
      if (extra.length) rows.unshift(extra[0]);
    }
  }

  return rows;
}
