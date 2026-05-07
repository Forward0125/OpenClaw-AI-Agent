/**
 * Append-only workflow history persisted to localStorage.
 *
 * The orchestrator (step 5) is the writer — it calls startWorkflow()
 * when a user kicks off a request, then appendEvent() as agents fire,
 * then completeWorkflow() / failWorkflow() at the end. The Memory
 * agent (step 6) and the analytics dashboard (step 11) are readers.
 *
 * Pub-sub mirrors the paper-trading store from the trading-terminal
 * project so multiple components stay in sync without prop-drilling.
 */

const STORAGE_KEY = "openclaw:workflows";
const HISTORY_MAX = 100;

// ─── Types ────────────────────────────────────────────────────────

export type WorkflowStatus =
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentName =
  | "Orchestrator"
  | "Calendar"
  | "Slack"
  | "GitHub"
  | "Email"
  | "Memory"
  | "Approval";

/** Distributive Omit so each union variant keeps its own keys after
 *  removing `id` + `ts`. Plain `Omit<WorkflowEvent, ...>` collapses
 *  the union to its common-key intersection — wrong here because
 *  every variant has different keys. */
export type WorkflowEventInput =
  WorkflowEvent extends infer U
    ? U extends WorkflowEvent
      ? Omit<U, "id" | "ts">
      : never
    : never;

/** Discriminated event emitted into the run's `events` array. */
export type WorkflowEvent =
  | { id: string; ts: string; type: "agent.start";       agent: AgentName; reason?: string }
  | { id: string; ts: string; type: "agent.message";     agent: AgentName; text: string }
  | { id: string; ts: string; type: "agent.done";        agent: AgentName; summary?: string }
  | { id: string; ts: string; type: "tool.call";         agent: AgentName; tool: string; args: unknown }
  | { id: string; ts: string; type: "tool.result";       agent: AgentName; tool: string; result: unknown; sourceIds?: string[] }
  | { id: string; ts: string; type: "approval.required"; agent: AgentName; action: string; details: string; approvalId: string }
  | { id: string; ts: string; type: "approval.resolved"; approvalId: string; decision: "approve" | "decline"; resolvedBy?: string }
  | { id: string; ts: string; type: "workflow.complete"; finalAnswer: string }
  | { id: string; ts: string; type: "workflow.failed";   error: string };

export interface WorkflowRun {
  id:            string;
  query:         string;
  status:        WorkflowStatus;
  startedAt:     string;
  finishedAt?:   string;
  events:        WorkflowEvent[];
  finalAnswer?:  string;
  error?:        string;
  /** Set of agents that fired during the run — useful for the
   *  "Tool Usage Distribution" donut on the analytics dashboard. */
  agentsUsed:    AgentName[];
}

// ─── Store internals ──────────────────────────────────────────────

let cached: WorkflowRun[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): WorkflowRun[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkflowRun[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(runs: WorkflowRun[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // Quota — older runs will fall off the cap below; nothing to do.
  }
}

function commit(next: WorkflowRun[]): void {
  cached = next;
  writeStorage(next);
  for (const fn of listeners) fn();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Public read surface ──────────────────────────────────────────

export function loadWorkflows(): WorkflowRun[] {
  if (!cached) cached = readStorage();
  return cached;
}

export function subscribeWorkflows(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getWorkflow(id: string): WorkflowRun | undefined {
  return loadWorkflows().find((r) => r.id === id);
}

// ─── Public write surface (orchestrator-facing) ───────────────────

export function startWorkflow(query: string): WorkflowRun {
  const run: WorkflowRun = {
    id:         newId("wf"),
    query,
    status:     "running",
    startedAt:  new Date().toISOString(),
    events:     [],
    agentsUsed: [],
  };
  const next = [run, ...loadWorkflows()];
  if (next.length > HISTORY_MAX) next.length = HISTORY_MAX;
  commit(next);
  return run;
}

export function appendEvent(runId: string, partial: WorkflowEventInput): WorkflowEvent {
  const event = { ...partial, id: newId("ev"), ts: new Date().toISOString() } as WorkflowEvent;

  const runs = loadWorkflows().map((r) => {
    if (r.id !== runId) return r;

    const agentsUsed = "agent" in event && !r.agentsUsed.includes(event.agent)
      ? [...r.agentsUsed, event.agent]
      : r.agentsUsed;

    let status: WorkflowStatus = r.status;
    if (event.type === "approval.required")     status = "awaiting_approval";
    else if (event.type === "approval.resolved") status = "running";

    return { ...r, events: [...r.events, event], agentsUsed, status };
  });
  commit(runs);
  return event;
}

export function completeWorkflow(runId: string, finalAnswer: string): void {
  const runs = loadWorkflows().map((r) =>
    r.id === runId
      ? {
          ...r,
          status:      "completed" as WorkflowStatus,
          finishedAt:  new Date().toISOString(),
          finalAnswer,
          events: [
            ...r.events,
            { id: newId("ev"), ts: new Date().toISOString(), type: "workflow.complete" as const, finalAnswer },
          ],
        }
      : r,
  );
  commit(runs);
}

export function failWorkflow(runId: string, error: string): void {
  const runs = loadWorkflows().map((r) =>
    r.id === runId
      ? {
          ...r,
          status:     "failed" as WorkflowStatus,
          finishedAt: new Date().toISOString(),
          error,
          events: [
            ...r.events,
            { id: newId("ev"), ts: new Date().toISOString(), type: "workflow.failed" as const, error },
          ],
        }
      : r,
  );
  commit(runs);
}

export function cancelWorkflow(runId: string): void {
  const runs = loadWorkflows().map((r) =>
    r.id === runId
      ? { ...r, status: "cancelled" as WorkflowStatus, finishedAt: new Date().toISOString() }
      : r,
  );
  commit(runs);
}

export function clearWorkflowHistory(): void {
  commit([]);
}
