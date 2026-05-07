/**
 * Real ModelClient implementation calling OpenAI Chat Completions.
 * Used by the /api/run + /api/run/resume routes; mirrors the
 * scripted client used by the orchestrator smoke tests.
 *
 * Edge-runtime safe — only uses fetch + JSON.
 */

import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ModelClient,
  ToolCall,
} from "./orchestrator";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MODEL    = "gpt-4o-mini";

interface OpenAIChoice {
  message: {
    role:        "assistant";
    content?:    string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason?: string;
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
  error?:   { message?: string };
}

// OpenAI restricts function names to ^[a-zA-Z0-9_-]+$ — encode our
// `calendar.findSlots` etc as `calendar__findSlots` for the wire.
// Internal naming stays unchanged so we don't ripple a rename through
// every smoke test + agent definition.
const encodeName = (n: string): string => n.replace(/\./g, "__");
const decodeName = (n: string): string => n.replace(/__/g, ".");

function recodeToolCallsOut(tcs: ToolCall[] | undefined): ToolCall[] | undefined {
  if (!tcs) return tcs;
  return tcs.map((tc) => ({
    ...tc,
    function: { ...tc.function, name: encodeName(tc.function.name) },
  }));
}

function recodeMessageOut(m: ChatMessage): ChatMessage {
  // assistant turns we replay back to OpenAI carry tool_calls; recode them.
  // tool turns reference a tool by name in the `name` field; recode that too.
  if (m.tool_calls)            return { ...m, tool_calls: recodeToolCallsOut(m.tool_calls) };
  if (m.role === "tool" && m.name) return { ...m, name: encodeName(m.name) };
  return m;
}

export class OpenAIClient implements ModelClient {
  constructor(private apiKey: string) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model:                MODEL,
      messages:             req.messages.map(recodeMessageOut),
      temperature:          0.2,
      parallel_tool_calls:  false,
    };
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        ...t,
        function: { ...t.function, name: encodeName(t.function.name) },
      }));
    }
    if (req.forceToolName) {
      body.tool_choice = { type: "function", function: { name: encodeName(req.forceToolName) } };
    }

    const res = await fetch(ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`openai ${res.status}: ${detail}`);
    }

    const json = (await res.json()) as OpenAIResponse;
    if (json.error) throw new Error(`openai error: ${json.error.message ?? "unknown"}`);

    const msg = json.choices?.[0]?.message;
    const decoded = (msg?.tool_calls ?? []).map((tc) => ({
      ...tc,
      function: { ...tc.function, name: decodeName(tc.function.name) },
    }));
    return {
      content:    msg?.content ?? null,
      tool_calls: decoded,
    };
  }
}
