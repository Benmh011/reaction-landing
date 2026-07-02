import { invokeModel, EMBEDDING_MODEL } from "./bedrock";

// ---------------------------------------------------------------------------
// Embeddings are provider-swappable for portability: Titan on Bedrock today,
// a local embedder (bge-m3 via Ollama's OpenAI-compatible /embeddings) on the
// box later — chosen by env, no code change. Keep any local model at 1024
// dims (bge-m3 is) so it matches the vector(1024) schema column.
//   EMBED_PROVIDER = "bedrock" (default) | "openai"
//   EMBED_BASE_URL, EMBED_MODEL, EMBED_API_KEY   (for "openai")
// ---------------------------------------------------------------------------
const PROVIDER = (process.env.EMBED_PROVIDER ?? "bedrock").toLowerCase();

async function embedBedrock(text: string): Promise<number[]> {
  const out = await invokeModel(EMBEDDING_MODEL, {
    inputText: text,
    dimensions: 1024,
    normalize: true, // unit vectors -> cosine distance behaves well
  });
  return out.embedding as number[];
}

async function embedOpenAI(text: string): Promise<number[]> {
  const baseURL = process.env.EMBED_BASE_URL;
  const model = process.env.EMBED_MODEL;
  if (!baseURL || !model) {
    throw new Error("EMBED_PROVIDER=openai requires EMBED_BASE_URL and EMBED_MODEL");
  }
  const res = await fetch(`${baseURL.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.EMBED_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`embeddings HTTP ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const v = data.data?.[0]?.embedding;
  if (!Array.isArray(v)) throw new Error("embeddings: no vector in response");
  return v as number[];
}

/** Embed a single string -> 1024-dim vector, via the configured provider. */
export async function embed(text: string): Promise<number[]> {
  return PROVIDER === "openai" ? embedOpenAI(text) : embedBedrock(text);
}

/** Embed many strings with a small concurrency limit. */
export async function embedBatch(
  texts: string[],
  concurrency = 5,
): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);
  let i = 0;
  async function worker() {
    while (i < texts.length) {
      const idx = i++;
      results[idx] = await embed(texts[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, texts.length) }, worker),
  );
  return results;
}

/** Format a JS number[] as a pgvector literal: '[0.1,0.2,...]'. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
