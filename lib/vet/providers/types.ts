// ---------------------------------------------------------------------------
// Provider abstraction. The agent loop talks to THIS interface, never to a
// specific model API. A provider's job is to translate the normalized
// conversation + tools into its own wire format, call the model, and translate
// the response back. That is the entire seam that lets one codebase run
// Claude-on-Bedrock today and an open-weight model (hosted or local Ollama)
// with a config change.
// ---------------------------------------------------------------------------

/** A tool the model may call. `parameters` is a JSON Schema object — the same
 *  shape works for both Anthropic (`input_schema`) and OpenAI (`function`). */
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** A tool call the model asked for, normalized across providers. */
export interface NormToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

/** One normalized conversation message. */
export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: NormToolCall[]; // assistant only
  toolCallId?: string;        // tool only
  name?: string;              // tool only
}

export interface GenerateInput {
  system: string;
  messages: ChatMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  temperature?: number;
  // "required" forces the model to call a tool (used to compel grounding).
  toolChoice?: "auto" | "required" | "none";
}

export interface GenerateOutput {
  text: string;            // assistant text (may be "" when only calling tools)
  toolCalls: NormToolCall[]; // empty array => this is the final answer
  usage: { inputTokens: number; outputTokens: number };
  raw?: unknown;
}

/** Callbacks for streamed generation. onDelta receives chunks of final-answer
 *  text as the model writes them; onResetText fires if a turn that was emitting
 *  text turns out to be a tool call (the partial text should be discarded). */
export interface StreamHandlers {
  onDelta?: (text: string) => void;
  onResetText?: () => void;
}

export interface ModelProvider {
  id: string;
  label: string;
  model: string;
  generate(input: GenerateInput): Promise<GenerateOutput>;
  // Optional: same contract as generate, but streams text via handlers.
  generateStream?(input: GenerateInput, handlers: StreamHandlers): Promise<GenerateOutput>;
}
