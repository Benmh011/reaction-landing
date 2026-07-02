import { invokeModel } from "../bedrock";
import type {
  ChatMessage,
  GenerateInput,
  GenerateOutput,
  ModelProvider,
  ToolDef,
} from "./types";

// Translate normalized messages into Anthropic's content-block format.
// Consecutive tool results collapse into a single user message, which is what
// the Anthropic messages API expects after a tool_use turn.
function toAnthropicMessages(messages: ChatMessage[]) {
  const out: any[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
      i++;
    } else if (m.role === "assistant") {
      const content: any[] = [];
      if (m.content) content.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls ?? []) {
        content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
      }
      out.push({ role: "assistant", content });
      i++;
    } else {
      const blocks: any[] = [];
      while (i < messages.length && messages[i].role === "tool") {
        const t = messages[i];
        blocks.push({ type: "tool_result", tool_use_id: t.toolCallId, content: t.content });
        i++;
      }
      out.push({ role: "user", content: blocks });
    }
  }
  return out;
}

function toAnthropicTools(tools: ToolDef[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

export function bedrockProvider(opts: {
  id: string;
  label: string;
  model: string;
}): ModelProvider {
  return {
    ...opts,
    async generate(input: GenerateInput): Promise<GenerateOutput> {
      const hasTools = input.tools.length > 0;
      // Anthropic: {type:"any"} forces a tool call, {type:"auto"} lets the model
      // choose. Mirror the openai-compatible "required" → force-a-tool behaviour.
      const choice =
        input.toolChoice === "auto"
          ? { type: "auto" }
          : input.toolChoice === "none"
            ? undefined
            : { type: "any" };
      const res = await invokeModel(opts.model, {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: input.maxTokens ?? 1500,
        temperature: input.temperature ?? 0,
        system: input.system,
        ...(hasTools
          ? { tools: toAnthropicTools(input.tools), ...(choice ? { tool_choice: choice } : {}) }
          : {}),
        messages: toAnthropicMessages(input.messages),
      });

      const content: any[] = res.content ?? [];
      const text = content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      const toolCalls = content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ id: b.id, name: b.name, args: b.input ?? {} }));

      return {
        text,
        toolCalls,
        usage: {
          inputTokens: res.usage?.input_tokens ?? 0,
          outputTokens: res.usage?.output_tokens ?? 0,
        },
        raw: res,
      };
    },
  };
}
