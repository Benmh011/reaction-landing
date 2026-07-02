import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";

// Lazy singleton so the region/credentials are read at call time, not import time.
let _client: BedrockRuntimeClient | null = null;
function client(): BedrockRuntimeClient {
  return (_client ??= new BedrockRuntimeClient({ region: process.env.AWS_REGION }));
}

export type ImageFormat = "png" | "jpeg" | "gif" | "webp";
export type DocFormat =
  | "pdf" | "csv" | "doc" | "docx" | "xls" | "xlsx" | "html" | "txt" | "md";

// A single piece of message content: text, an image, or a document.
export type ContentBlock =
  | { text: string }
  | { image: { format: ImageFormat; source: { bytes: Uint8Array } } }
  | { document: { format: DocFormat; name: string; source: { bytes: Uint8Array } } };

export type BedrockMessage = {
  role: "user" | "assistant";
  content: ContentBlock[];
};

/** Generate a grounded answer with Claude via the Bedrock Converse API. */
export async function converse(opts: {
  system: string;
  messages: BedrockMessage[];
  maxTokens?: number;
  temperature?: number;
  modelId?: string; // defaults to the Sonnet env var; pass the Haiku id for fast lookups
}): Promise<{ text: string; usage?: unknown }> {
  const cmd = new ConverseCommand({
    modelId: opts.modelId ?? process.env.BEDROCK_MODEL_ID!, // confirm exact ids in console
    system: [{ text: opts.system }],
    // Our ContentBlock shapes match the SDK's union; cast at the boundary.
    messages: opts.messages as unknown as Message[],
    inferenceConfig: {
      maxTokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.2,
    },
  });

  const res = await client().send(cmd);
  const block = res.output?.message?.content?.find((c) => "text" in c) as
    | { text: string }
    | undefined;
  return { text: block?.text ?? "", usage: res.usage };
}

/** Embed a string with Amazon Titan Text Embeddings v2 (1024 dimensions). */
export async function embed(text: string): Promise<number[]> {
  const cmd = new InvokeModelCommand({
    modelId: process.env.BEDROCK_EMBED_MODEL_ID ?? "amazon.titan-embed-text-v2:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: text, dimensions: 1024, normalize: true }),
  });

  const res = await client().send(cmd);
  const json = JSON.parse(new TextDecoder().decode(res.body));
  return json.embedding as number[];
}
