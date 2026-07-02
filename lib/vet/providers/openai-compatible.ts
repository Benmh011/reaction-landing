import type {
  ChatMessage,
  GenerateInput,
  GenerateOutput,
  ModelProvider,
  ToolDef,
} from "./types";

// One provider for every OpenAI-compatible endpoint: OpenRouter, Together,
// Fireworks, DeepInfra, and a LOCAL Ollama / llama.cpp server
// (baseURL http://localhost:11434/v1). Only baseURL + model + key change.

function toOpenAIMessages(system: string, messages: ChatMessage[]) {
  const out: any[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const msg: any = { role: "assistant", content: m.content || null };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        }));
      }
      out.push(msg);
    } else {
      out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    }
  }
  return out;
}

function toOpenAITools(tools: ToolDef[]) {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function safeParse(s: string | undefined): Record<string, any> {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export function openAICompatibleProvider(opts: {
  id: string;
  label: string;
  model: string;
  baseURL: string;
  apiKey: string;
  headers?: Record<string, string>;
}): ModelProvider {
  return {
    id: opts.id,
    label: opts.label,
    model: opts.model,
    async generate(input: GenerateInput): Promise<GenerateOutput> {
      const hasTools = input.tools.length > 0;
      const body: Record<string, unknown> = {
        model: opts.model,
        messages: toOpenAIMessages(input.system, input.messages),
        temperature: input.temperature ?? 0,
        max_tokens: input.maxTokens ?? 1500,
      };
      if (hasTools) {
        body.tools = toOpenAITools(input.tools);
        // Default to forcing a tool call so the model cannot answer from memory
        // without grounding; callers pass "auto" once grounding has happened.
        body.tool_choice = input.toolChoice ?? "required";
      }

      const res = await fetch(`${opts.baseURL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
          ...(opts.headers ?? {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`${opts.label} HTTP ${res.status}: ${await res.text()}`);
      }

      const data: any = await res.json();
      const msg = data.choices?.[0]?.message ?? {};
      const text = typeof msg.content === "string" ? msg.content : "";
      const toolCalls = (msg.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name,
        args: safeParse(tc.function?.arguments),
      }));

      return {
        text,
        toolCalls,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        raw: data,
      };
    },

    async generateStream(input, handlers) {
      const hasTools = input.tools.length > 0;
      const body: Record<string, unknown> = {
        model: opts.model,
        messages: toOpenAIMessages(input.system, input.messages),
        temperature: input.temperature ?? 0,
        max_tokens: input.maxTokens ?? 1500,
        stream: true,
        stream_options: { include_usage: true },
      };
      if (hasTools) {
        body.tools = toOpenAITools(input.tools);
        body.tool_choice = input.toolChoice ?? "required";
      }

      const res = await fetch(`${opts.baseURL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
          ...(opts.headers ?? {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        throw new Error(`${opts.label} HTTP ${res.status}: ${res.ok ? "no body" : await res.text()}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let text = "";
      let usage = { inputTokens: 0, outputTokens: 0 };
      const toolMap = new Map<number, { id: string; name: string; args: string }>();
      let toolSeen = false;
      let emittedText = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let json: any;
          try {
            json = JSON.parse(payload);
          } catch {
            continue;
          }
          if (json.usage) {
            usage = {
              inputTokens: json.usage.prompt_tokens ?? usage.inputTokens,
              outputTokens: json.usage.completion_tokens ?? usage.outputTokens,
            };
          }
          const delta = json.choices?.[0]?.delta ?? {};
          if (delta.tool_calls) {
            toolSeen = true;
            if (emittedText) {
              handlers.onResetText?.();
              emittedText = false;
              text = "";
            }
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const cur = toolMap.get(idx) ?? { id: "", name: "", args: "" };
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name = tc.function.name;
              if (tc.function?.arguments) cur.args += tc.function.arguments;
              toolMap.set(idx, cur);
            }
          }
          if (typeof delta.content === "string" && delta.content.length) {
            text += delta.content;
            if (!toolSeen) {
              emittedText = true;
              handlers.onDelta?.(delta.content);
            }
          }
        }
      }

      const toolCalls = [...toolMap.values()]
        .filter((t) => t.name)
        .map((t) => ({ id: t.id || `call_${t.name}`, name: t.name, args: safeParse(t.args) }));

      return { text, toolCalls, usage, raw: null };
    },
  };
}
