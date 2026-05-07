/**
 * Orchestrator engine — the LangGraph-inspired state machine that
 * runs OpenClaw workflows.
 *
 * Concepts:
 *   - State: { messages, currentAgent, status, ... }
 *   - Nodes: agents (Orchestrator + 5 specialists)
 *   - Edges: conditional, decided by the LLM via tool calls
 *   - Approval gate: any 'destructive' tool call pauses the engine
 *     and emits approval.required; the run resumes after the user
 *     decides.
 *
 * Framework-agnostic: takes a `ModelClient` adapter so unit tests
 * can stub the LLM. The Vercel API route (step 7) wires it to
 * OpenAI Chat Completions.
 *
 * The engine is "step-based" rather than a single async generator
 * so it can be paused (for approvals) and resumed cleanly across
 * a stateless serverless function. State is fully serializable.
 */

import {
  AGENTS,
  delegateAgentFromToolName,
  isDelegateToolName,
  realToolsForAgent,
} from "./agents";
import {
  TOOLS,
  toOpenAIFunctions,
  type Tool,
} from "./tools";
import {
  appendEvent,
  type AgentName,
  type WorkflowEvent,
  type WorkflowEventInput,
} from "./workflow-store";

// ─── Model adapter ────────────────────────────────────────────────

/** OpenAI-shaped chat-completion message, narrowed to what we use. */
export interface ChatMessage {
  role:           "system" | "user" | "assistant" | "tool";
  content:        string | null;
  name?:          string;
  tool_call_id?:  string;
  tool_calls?:    ToolCall[];
}

export interface ToolCall {
  id:        string;
  type:      "function";
  function:  { name: string; arguments: string };
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** OpenAI function-calling format (toOpenAIFunctions output). */
  tools?:   ReturnType<typeof toOpenAIFunctions>;
  /** Force-call a specific tool name, for tests. */
  forceToolName?: string;
}

export interface ChatResponse {
  content:    string | null;
  tool_calls: ToolCall[];
}

export interface ModelClient {
  chat(req: ChatRequest): Promise<ChatResponse>;
}

// ─── Engine state ─────────────────────────────────────────────────

export type EngineStatus = "running" | "awaiting_approval" | "completed" | "failed";

export interface PendingApproval {
  approvalId:   string;
  agent:        AgentName;
  toolName:     string;
  toolCallId:   string;
  args:         unknown;
  details:      string;
}

export interface EngineState {
  runId:           string;
  query:           string;
  currentAgent:    AgentName;
  messages:        ChatMessage[];
  status:          EngineStatus;
  iters:           number;
  finalAnswer?:    string;
  error?:          string;
  pendingApproval?: PendingApproval;
}

// ─── Configuration ────────────────────────────────────────────────

const MAX_ITERS              = 12;     // total LLM calls per workflow
const MAX_TOOL_CALLS_PER_TURN = 5;
const PERSIST = (runId: string, ev: WorkflowEventInput): void => {
  appendEvent(runId, ev);
};

// ─── Public API ───────────────────────────────────────────────────

export interface RunOptions {
  client:    ModelClient;
  /** Side-effect callback for every WorkflowEvent the engine emits.
   *  Defaults to persisting via appendEvent(). The SSE route (step
   *  7) overrides this to ALSO push events into the response stream. */
  onEvent?:  (ev: WorkflowEventInput) => void;
}

/** Build the initial state for a new workflow run. */
export function initState(runId: string, query: string): EngineState {
  return {
    runId,
    query,
    currentAgent: "Orchestrator",
    messages: [
      { role: "system", content: AGENTS.Orchestrator.systemPrompt },
      { role: "user",   content: query },
    ],
    status: "running",
    iters:  0,
  };
}

/** Drive the engine until it either terminates or pauses for approval. */
export async function runUntilPause(
  state:   EngineState,
  options: RunOptions,
): Promise<EngineState> {
  let s = state;
  while (s.status === "running" && s.iters < MAX_ITERS) {
    s = await stepOnce(s, options);
  }
  if (s.status === "running") {
    const error = `max iterations (${MAX_ITERS}) exceeded`;
    s = { ...s, status: "failed", error };
    const ev: WorkflowEventInput = { type: "workflow.failed", error };
    emit(s, options, ev);
  }
  return s;
}

/** Resume a paused run after the user decided on the pending approval. */
export async function resumeAfterApproval(
  state:    EngineState,
  decision: "approve" | "decline",
  options:  RunOptions,
): Promise<EngineState> {
  if (state.status !== "awaiting_approval" || !state.pendingApproval) {
    throw new Error("resumeAfterApproval: not paused");
  }
  const pa = state.pendingApproval;

  emit(state, options, {
    type:        "approval.resolved",
    approvalId:  pa.approvalId,
    decision,
    resolvedBy:  "user",
  });

  let toolResultContent: string;
  if (decision === "approve") {
    const tool = TOOLS.find((t) => t.name === pa.toolName);
    if (!tool) {
      toolResultContent = JSON.stringify({ error: `unknown tool ${pa.toolName}` });
    } else {
      try {
        const result = await tool.handler(pa.args as never);
        emit(state, options, {
          type:   "tool.result",
          agent:  pa.agent,
          tool:   pa.toolName,
          result,
        });
        toolResultContent = JSON.stringify(result);
      } catch (err) {
        toolResultContent = JSON.stringify({ error: String(err) });
      }
    }
  } else {
    const declined = { error: "user declined this action" };
    emit(state, options, { type: "tool.result", agent: pa.agent, tool: pa.toolName, result: declined });
    toolResultContent = JSON.stringify(declined);
  }

  const next: EngineState = {
    ...state,
    status:          "running",
    pendingApproval: undefined,
    messages: [
      ...state.messages,
      {
        role:         "tool",
        tool_call_id: pa.toolCallId,
        name:         pa.toolName,
        content:      toolResultContent,
      },
    ],
  };
  return runUntilPause(next, options);
}

// ─── Internals ────────────────────────────────────────────────────

function emit(
  state:   EngineState,
  options: RunOptions,
  ev:      WorkflowEventInput,
): void {
  if (options.onEvent) options.onEvent(ev);
  else                  PERSIST(state.runId, ev);
}

async function stepOnce(state: EngineState, options: RunOptions): Promise<EngineState> {
  const agent = AGENTS[state.currentAgent];
  const tools = realToolsForAgent(state.currentAgent);
  const toolDefs = [
    ...toOpenAIFunctions(tools),
    // Inject delegate tools for the Orchestrator. They have no
    // handlers; the engine intercepts them by name.
    ...(state.currentAgent === "Orchestrator"
      ? agent.toolNames
          .filter(isDelegateToolName)
          .map((name) => ({
            type: "function" as const,
            function: {
              name,
              description: `Delegate the user's request to the ${name.slice("delegate.".length)} agent.`,
              parameters: {
                type: "object" as const,
                additionalProperties: false as const,
                required: ["instructions"],
                properties: {
                  instructions: { type: "string" as const, description: "What you need the specialist to do." },
                },
              },
            },
          }))
      : []),
  ];

  emit(state, options, { type: "agent.start", agent: state.currentAgent });

  const response = await options.client.chat({ messages: state.messages, tools: toolDefs });

  // Record any text the agent surfaced.
  if (response.content && response.content.trim().length > 0 && response.tool_calls.length === 0) {
    emit(state, options, { type: "agent.message", agent: state.currentAgent, text: response.content });
  }

  let s: EngineState = { ...state, iters: state.iters + 1 };

  // Append the assistant turn (text + tool_calls) to the message log
  s = {
    ...s,
    messages: [
      ...s.messages,
      {
        role:       "assistant",
        content:    response.content,
        tool_calls: response.tool_calls.length > 0 ? response.tool_calls : undefined,
      },
    ],
  };

  // No tool calls: this is a "specialist done" turn for non-orchestrator
  // agents. Switch back to Orchestrator with the specialist's text as
  // a system note.
  if (response.tool_calls.length === 0) {
    if (s.currentAgent === "Orchestrator") {
      // Orchestrator returned text without calling respond() — treat
      // as failure per the system prompt.
      const text = response.content ?? "(empty)";
      s = { ...s, status: "failed", error: `Orchestrator returned text without calling respond: ${text.slice(0, 100)}` };
      emit(s, options, { type: "workflow.failed", error: s.error! });
      return s;
    }
    // Specialist done — return to Orchestrator.
    emit(s, options, { type: "agent.done", agent: s.currentAgent, summary: response.content ?? "" });
    return {
      ...s,
      currentAgent: "Orchestrator",
      messages: [
        ...s.messages,
        {
          role:    "system",
          content: AGENTS.Orchestrator.systemPrompt,
        },
        {
          role:    "user",
          content:
            `${s.currentAgent} agent reports:\n\n${response.content ?? "(no summary)"}\n\n` +
            `Decide the next step (delegate again, or respond to the user).`,
        },
      ],
    };
  }

  // Process tool calls.
  let next = s;
  for (const tc of response.tool_calls.slice(0, MAX_TOOL_CALLS_PER_TURN)) {
    const result = await processToolCall(next, tc, options);
    next = result.state;
    if (next.status !== "running") return next;
  }

  return next;
}

interface ToolCallOutcome {
  state: EngineState;
}

async function processToolCall(
  state:   EngineState,
  call:    ToolCall,
  options: RunOptions,
): Promise<ToolCallOutcome> {
  const name = call.function.name;
  let args: unknown;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return appendToolError(state, call, "invalid JSON in tool arguments");
  }

  // delegate.{Agent} — virtual, intercepted here.
  if (isDelegateToolName(name)) {
    const target = delegateAgentFromToolName(name);
    if (!target || target === "Orchestrator" || target === "Approval") {
      return appendToolError(state, call, `cannot delegate to ${target}`);
    }
    const instr = (args as { instructions?: string }).instructions ?? "";
    emit(state, options, { type: "tool.call", agent: state.currentAgent, tool: name, args });
    emit(state, options, { type: "agent.start", agent: target, reason: instr });

    return {
      state: {
        ...state,
        currentAgent: target,
        messages: [
          ...state.messages,
          {
            role:         "tool",
            tool_call_id: call.id,
            name,
            content:      JSON.stringify({ ok: true, delegatedTo: target }),
          },
          {
            role:    "system",
            content: AGENTS[target].systemPrompt,
          },
          {
            role:    "user",
            content: `Original request: ${state.query}\n\nOrchestrator instructions for you: ${instr}`,
          },
        ],
      },
    };
  }

  // respond() — terminal.
  if (name === "respond") {
    const answer = (args as { answer?: string }).answer ?? "";
    emit(state, options, { type: "tool.call", agent: state.currentAgent, tool: name, args });
    emit(state, options, { type: "workflow.complete", finalAnswer: answer });
    return {
      state: {
        ...state,
        status:      "completed",
        finalAnswer: answer,
      },
    };
  }

  // Real tool — find it.
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return appendToolError(state, call, `unknown tool ${name}`);
  }

  // Capability enforcement: agent can only call tools in its allowed list.
  const allowed = AGENTS[state.currentAgent].toolNames;
  if (!allowed.includes(tool.name)) {
    return appendToolError(state, call,
      `agent ${state.currentAgent} is not authorized to call ${tool.name}`);
  }

  emit(state, options, { type: "tool.call", agent: state.currentAgent, tool: tool.name, args });

  // Destructive: pause for approval.
  if (tool.riskLevel === "destructive") {
    const approvalId = `ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const details = describeApproval(tool, args);
    emit(state, options, {
      type:    "approval.required",
      agent:   state.currentAgent,
      action:  tool.name,
      details,
      approvalId,
    });
    return {
      state: {
        ...state,
        status:          "awaiting_approval",
        pendingApproval: {
          approvalId,
          agent:      state.currentAgent,
          toolName:   tool.name,
          toolCallId: call.id,
          args,
          details,
        },
      },
    };
  }

  // Safe: execute and append result.
  let result: unknown;
  try {
    result = await tool.handler(args as never);
  } catch (err) {
    return appendToolError(state, call, `tool error: ${err instanceof Error ? err.message : String(err)}`);
  }
  emit(state, options, { type: "tool.result", agent: state.currentAgent, tool: tool.name, result });

  return {
    state: {
      ...state,
      messages: [
        ...state.messages,
        {
          role:         "tool",
          tool_call_id: call.id,
          name:         tool.name,
          content:      JSON.stringify(result),
        },
      ],
    },
  };
}

function appendToolError(
  state: EngineState,
  call:  ToolCall,
  error: string,
): ToolCallOutcome {
  return {
    state: {
      ...state,
      messages: [
        ...state.messages,
        {
          role:         "tool",
          tool_call_id: call.id,
          name:         call.function.name,
          content:      JSON.stringify({ error }),
        },
      ],
    },
  };
}

function describeApproval(tool: Tool, args: unknown): string {
  // Compact human-readable summary for the approval card.
  switch (tool.name) {
    case "calendar.createEvent": {
      const a = args as { title?: string; start?: string; attendees?: string[] };
      return `Schedule "${a.title ?? "(untitled)"}" at ${a.start ?? "?"} with ${a.attendees?.length ?? 0} attendee(s)`;
    }
    case "slack.sendMessage": {
      const a = args as { channel?: string; text?: string };
      return `Post to ${a.channel ?? "?"}: ${a.text?.slice(0, 80) ?? "(empty)"}`;
    }
    case "email.send": {
      const a = args as { to?: string[]; subject?: string };
      return `Send email "${a.subject ?? "(no subject)"}" to ${a.to?.join(", ") ?? "?"}`;
    }
    default:
      return `Run ${tool.name} with ${JSON.stringify(args).slice(0, 120)}`;
  }
}
