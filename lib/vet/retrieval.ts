import { prisma } from "./db";
import { embed, toVectorLiteral } from "./embeddings";
import type { Site } from "@prisma-vet/client";

// pgvector cosine distance is `<=>`; smaller = more similar. We expose it as
// a similarity score (1 - distance) for readability.

export interface RetrievedChunk {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl: string | null;
  similarity: number;
  metadata?: unknown;
}

/** Vector search over the knowledge base, optionally filtered to one domain. */
async function searchKnowledge(
  query: string,
  domain: "CLINICAL" | "MEDICATION" | "LEGISLATION",
  k = 6,
): Promise<RetrievedChunk[]> {
  const v = toVectorLiteral(await embed(query));
  return prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT id, title, content, source, "sourceUrl", metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM "KnowledgeChunk"
     WHERE domain = $2::"KnowledgeDomain" AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    v,
    domain,
    k,
  );
}

/** TOOL 1 — clinical knowledge (symptoms, conditions, treatment protocols).
 *  Grounded in whatever clinical content has been ingested (practice protocols,
 *  licensed references). Species is an optional filter passed via the query. */
export function searchClinical(query: string, species?: string) {
  const q = species ? `${species}: ${query}` : query;
  return searchKnowledge(q, "CLINICAL");
}

// Words too generic to be useful search tokens (species are handled separately).
const MED_STOPWORDS = new Set([
  "for", "the", "and", "with", "what", "can", "could", "treat", "treatment",
  "use", "used", "using", "options", "option", "authorised", "authorized",
  "product", "products", "dose", "doses", "dosage", "disease", "condition",
  "in", "of", "to", "is", "are", "my", "this", "that", "give", "giving",
  "cattle", "cow", "cows", "calf", "calves", "dog", "dogs", "puppy", "cat",
  "cats", "kitten", "horse", "horses", "equine", "pig", "pigs", "piglet",
  "sheep", "lamb", "goat", "goats", "poultry", "chicken", "chickens", "bird",
  "birds", "rabbit", "fish", "bee", "bees", "bovine", "canine", "feline",
]);

function likeEscape(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

// VMD stores common species names ("Cattle", "Pigs", "Horses"); the model may
// ask in Latin ("bovine") or use age/sex words ("calf", "cow"). Map both ways so
// species can RANK results without ever excluding them.
const SPECIES_SYNONYMS: Record<string, string[]> = {
  bovine: ["cattle", "bovine", "calf", "calv", "cow", "bull", "heifer"],
  cattle: ["cattle", "bovine", "calf", "calv", "cow", "bull", "heifer"],
  porcine: ["pig", "porcine", "swine", "piglet", "sow", "boar"],
  pig: ["pig", "porcine", "swine", "piglet", "sow", "boar"],
  equine: ["horse", "equine", "pony", "foal", "mare", "stallion"],
  horse: ["horse", "equine", "pony", "foal", "mare", "stallion"],
  ovine: ["sheep", "ovine", "lamb", "ewe", "ram"],
  sheep: ["sheep", "ovine", "lamb", "ewe", "ram"],
  caprine: ["goat", "caprine", "kid"],
  goat: ["goat", "caprine", "kid"],
  canine: ["dog", "canine", "puppy", "bitch"],
  dog: ["dog", "canine", "puppy", "bitch"],
  feline: ["cat", "feline", "kitten"],
  cat: ["cat", "feline", "kitten"],
  avian: ["chicken", "poultry", "hen", "turkey", "duck", "bird", "avian"],
  poultry: ["chicken", "poultry", "hen", "turkey", "duck", "bird", "avian"],
};

function speciesPatterns(species?: string): string[] | null {
  if (!species) return null;
  const key = species.toLowerCase().trim();
  const syns = SPECIES_SYNONYMS[key] ?? [key];
  return syns.map((s) => `%${s}%`);
}

/** TOOL 2 — medications. Token-based fuzzy match over the regulated metadata
 *  (name, active substances, therapeutic group), so both named products
 *  ("Metacam") and substance/indication phrasing ("amoxicillin for BRD")
 *  surface the right authorised products. Returns the regulated facts plus
 *  each product's SPC link; the agent then calls fetch_spc on a chosen product
 *  to read the real dose / withdrawal periods. */
export async function searchMedications(opts: {
  query: string;
  species?: string;
  distributionCat?: string;
  k?: number;
}) {
  const { query, species, distributionCat, k = 8 } = opts;

  const q = query.toLowerCase().trim();
  const tokens = Array.from(
    new Set(q.split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !MED_STOPWORDS.has(t))),
  );
  // Full phrase first (best signal), then each significant token.
  const patterns = [`%${likeEscape(q)}%`, ...tokens.map((t) => `%${likeEscape(t)}%`)];

  // Searchable text per product: name + active substances + therapeutic group.
  const haystack = `lower(coalesce(name,'') || ' ' || array_to_string("activeSubstances", ' ') || ' ' || coalesce("therapeuticGroup",''))`;

  const params: any[] = [];
  let i = 1;
  const orClauses: string[] = [];
  for (const p of patterns) {
    params.push(p);
    orClauses.push(`${haystack} LIKE $${i++}`); // $1 = full phrase
  }
  let where = `status = 'authorised' AND (${orClauses.join(" OR ")})`;
  if (distributionCat) {
    params.push(distributionCat);
    where += ` AND "distributionCat" = $${i++}`;
  }

  // Species is a SOFT preference, never an exclusion. A hard equality filter here
  // ('bovine' = ANY("targetSpecies")) wrongly returned ZERO rows because VMD stores
  // "Cattle", not "bovine". We instead rank species-matching products to the top.
  let speciesRank = "";
  const sPatterns = speciesPatterns(species);
  if (sPatterns) {
    const likeParts = sPatterns.map((p) => {
      params.push(p);
      return `lower(array_to_string("targetSpecies", ' ')) LIKE $${i++}`;
    });
    speciesRank = `(${likeParts.join(" OR ")}) DESC, `;
  }

  params.push(k);
  const pK = `$${i++}`;

  // Rank: species match first (if asked), then full-phrase matches, then shorter
  // (more specific) names.
  const sql = `
    SELECT "vmNo", name, "activeSubstances", "targetSpecies",
           "distributionCat", "therapeuticGroup", "spcUrl"
    FROM "Medication"
    WHERE ${where}
    ORDER BY ${speciesRank}(${haystack} LIKE $1) DESC, length(name) ASC
    LIMIT ${pK}`;

  const structured = await prisma.$queryRawUnsafe<any[]>(sql, ...params);
  // Flag which products have a fetchable VMD-hosted SPC PDF (vs a generic EMA
  // link we cannot read) so the agent can prefer ones it can actually verify.
  for (const row of structured) {
    row.spcFetchable =
      typeof row.spcUrl === "string" && row.spcUrl.includes("vmd.defra.gov.uk");
  }
  return { structured };
}

/** TOOL 3 — legislation (statutes from legislation.gov.uk + RCVS code). */
export function searchLegislation(query: string) {
  return searchKnowledge(query, "LEGISLATION");
}

/** TOOL 4 — the practice's own records. ACCESS-CONTROLLED: every call must be
 *  scoped to the caller's site, and optionally to a specific client/animal.
 *  A chunk is never returned outside its site. */
export async function searchPracticeRecords(opts: {
  query: string;
  site: Site;
  clientRef?: string;
  animalRef?: string;
  k?: number;
}): Promise<RetrievedChunk[]> {
  const { query, site, clientRef, animalRef, k = 8 } = opts;

  // Resolve human-friendly refs to ids for scoping.
  let clientId: string | undefined;
  let animalId: string | undefined;
  if (clientRef) {
    const c = await prisma.client.findUnique({ where: { ref: clientRef } });
    clientId = c?.id;
  }
  if (animalRef) {
    const a = await prisma.animal.findFirst({ where: { ref: animalRef } });
    animalId = a?.id;
  }

  const v = toVectorLiteral(await embed(query));
  return prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT dc.id, pd.title, dc.content, pd."docType" AS source,
            NULL AS "sourceUrl",
            1 - (dc.embedding <=> $1::vector) AS similarity
     FROM "DocumentChunk" dc
     JOIN "PracticeDocument" pd ON pd.id = dc."documentId"
     WHERE dc.site = $2::"Site"
       AND dc.embedding IS NOT NULL
       AND ($3::text IS NULL OR dc."clientId" = $3)
       AND ($4::text IS NULL OR dc."animalId" = $4)
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $5`,
    v,
    site,
    clientId ?? null,
    animalId ?? null,
    k,
  );
}
