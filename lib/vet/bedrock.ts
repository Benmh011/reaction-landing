import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// DATA RESIDENCY: every model call is pinned to eu-central-1 (Frankfurt) so
// that clinical questions, client identifiers and record text never leave the
// EU. This mirrors the Articled decision and is what makes the tool defensible
// under GDPR and RCVS confidentiality. Do not change the region without a
// deliberate data-protection review.
const REGION = process.env.AWS_BEDROCK_REGION ?? "eu-central-1";

export const bedrock = new BedrockRuntimeClient({ region: REGION });

// Claude on Bedrock for generation/agent reasoning. Uses the EU inference
// profile (eu. prefix) so inference stays within Europe for data residency.
export const GENERATION_MODEL =
  process.env.BEDROCK_GENERATION_MODEL ?? "eu.anthropic.claude-sonnet-4-6";

// Cheaper model for simple routing/lookup turns (see pricing tiers).
export const ROUTING_MODEL =
  process.env.BEDROCK_ROUTING_MODEL ??
  "eu.anthropic.claude-haiku-4-5-20251001-v1:0";

// Embedding model. Titan Text Embeddings v2 outputs 1024 dims (matches schema).
// Cohere Embed (Multilingual) is an EU-available alternative, also 1024.
export const EMBEDDING_MODEL =
  process.env.BEDROCK_EMBEDDING_MODEL ?? "amazon.titan-embed-text-v2:0";

export const EMBEDDING_DIM = 1024;

/** Low-level helper to invoke a Bedrock model with a JSON body. */
export async function invokeModel(modelId: string, body: unknown) {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    }),
  );
  return JSON.parse(new TextDecoder().decode(res.body));
}
