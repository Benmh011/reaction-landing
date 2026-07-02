import { GENERATION_MODEL } from "../bedrock";
import { bedrockProvider } from "./bedrock-anthropic";
import { openAICompatibleProvider } from "./openai-compatible";
import type { ModelProvider } from "./types";

export * from "./types";

export type ProviderConfig =
  | { kind: "bedrock"; id: string; label: string; model: string }
  | {
      kind: "openai";
      id: string;
      label: string;
      model: string;
      baseURL: string;
      apiKey: string;
      headers?: Record<string, string>;
    };

export function makeProvider(cfg: ProviderConfig): ModelProvider {
  if (cfg.kind === "bedrock") {
    return bedrockProvider({ id: cfg.id, label: cfg.label, model: cfg.model });
  }
  return openAICompatibleProvider(cfg);
}

/** The production default. Env-driven for portability: Claude on Bedrock
 *  unless AGENT_PROVIDER=openai, in which case it runs on any OpenAI-compatible
 *  endpoint — OpenRouter now, a local Ollama later — with no code change. */
export function defaultProvider(): ModelProvider {
  const kind = (process.env.AGENT_PROVIDER ?? "bedrock").toLowerCase();
  if (kind === "openai") {
    const baseURL = process.env.AGENT_BASE_URL;
    const model = process.env.AGENT_MODEL;
    if (!baseURL || !model) {
      throw new Error("AGENT_PROVIDER=openai requires AGENT_BASE_URL and AGENT_MODEL");
    }
    return openAICompatibleProvider({
      id: "agent-configured",
      label: model,
      model,
      baseURL,
      apiKey: process.env.AGENT_API_KEY ?? "",
    });
  }
  return bedrockProvider({
    id: "claude-bedrock",
    label: "Claude (Bedrock)",
    model: GENERATION_MODEL,
  });
}
