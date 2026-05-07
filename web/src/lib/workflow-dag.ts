/**
 * Pure function: WorkflowRun events -> {nodes, edges} for xyflow.
 *
 * Strategy:
 *   - Always render: User Request (top), Orchestrator (next).
 *   - Each delegate.{Specialist} call produces a Specialist node
 *     connected from Orchestrator.
 *   - Specialist nodes carry status + tool-call count derived from
 *     their events.
 *   - Approval gates appear as a node attached below the agent
 *     that triggered them (when status is awaiting/resolved).
 *   - workflow.complete renders a Final Answer node connected from
 *     the Orchestrator.
 *
 * Node positions are computed deterministically so the layout
 * doesn't shuffle as more events arrive.
 */

import type { AgentName, WorkflowRun } from "./workflow-store";

export type NodeStatus = "idle" | "running" | "complete" | "failed" | "awaiting_approval";

export type DAGNodeKind = "user" | "orchestrator" | "agent" | "approval" | "final";

export interface DAGNodeData {
  label:        string;
  kind:         DAGNodeKind;
  status:       NodeStatus;
  agentName?:   AgentName;
  toolCalls?:   number;
  details?:     string;
  // xyflow's Node type requires data to be indexable:
  [key: string]: unknown;
}

export interface DAGNode {
  id:       string;
  data:     DAGNodeData;
  position: { x: number; y: number };
  type:     "openclaw";
}

export interface DAGEdge {
  id:       string;
  source:   string;
  target:   string;
  animated?: boolean;
}

export interface DAGState {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

const ROW_Y = {
  user:         0,
  orchestrator: 130,
  agents:       260,
  approvals:    400,
  final:        540,
};

const SPECIALIST_ORDER: AgentName[] = ["Memory", "Calendar", "Slack", "GitHub", "Email"];

export function buildDAG(run: WorkflowRun): DAGState {
  const nodes: DAGNode[] = [];
  const edges: DAGEdge[] = [];

  // 1. User node — always present.
  nodes.push({
    id: "user",
    type: "openclaw",
    position: { x: 240, y: ROW_Y.user },
    data: {
      label:   "User Request",
      kind:    "user",
      status:  "complete",
      details: run.query,
    },
  });

  // 2. Orchestrator — always present, status reflects run state.
  const orchStatus = orchestratorStatus(run);
  nodes.push({
    id: "orch",
    type: "openclaw",
    position: { x: 240, y: ROW_Y.orchestrator },
    data: {
      label:     "Orchestrator",
      kind:      "orchestrator",
      status:    orchStatus,
      toolCalls: run.events.filter((e) => e.type === "tool.call" && "agent" in e && e.agent === "Orchestrator").length,
    },
  });
  edges.push({ id: "e_user_orch", source: "user", target: "orch" });

  // 3. Specialist nodes — one per agent that's actually been delegated.
  const usedSpecialists = SPECIALIST_ORDER.filter((a) =>
    run.agentsUsed.includes(a) || run.events.some((e) => "agent" in e && e.agent === a),
  );

  const totalSpecialists = usedSpecialists.length;
  const spacing = 220;
  const totalWidth = (totalSpecialists - 1) * spacing;
  const startX = 240 - totalWidth / 2;

  usedSpecialists.forEach((agent, idx) => {
    const x = startX + idx * spacing;
    const status   = agentStatus(run, agent);
    const calls    = run.events.filter((e) => e.type === "tool.call" && "agent" in e && e.agent === agent).length;
    const lastCall = [...run.events].reverse().find((e) => e.type === "tool.call" && "agent" in e && e.agent === agent);
    nodes.push({
      id: `agent_${agent}`,
      type: "openclaw",
      position: { x, y: ROW_Y.agents },
      data: {
        label:     agent,
        kind:      "agent",
        agentName: agent,
        status,
        toolCalls: calls,
        details:   lastCall && "tool" in lastCall ? lastCall.tool : undefined,
      },
    });
    edges.push({
      id:       `e_orch_${agent}`,
      source:   "orch",
      target:   `agent_${agent}`,
      animated: status === "running" || status === "awaiting_approval",
    });
  });

  // 4. Approval gate — at most one active or recently-resolved.
  const lastApprovalRequired = [...run.events].reverse().find((e) => e.type === "approval.required");
  if (lastApprovalRequired && lastApprovalRequired.type === "approval.required") {
    const isPending = !run.events.some(
      (e) => e.type === "approval.resolved" && e.approvalId === lastApprovalRequired.approvalId,
    );
    const parentAgent = lastApprovalRequired.agent;
    nodes.push({
      id: `approval_${lastApprovalRequired.approvalId}`,
      type: "openclaw",
      position: { x: 240, y: ROW_Y.approvals },
      data: {
        label:   isPending ? "Awaiting Approval" : "Approval Resolved",
        kind:    "approval",
        status:  isPending ? "awaiting_approval" : "complete",
        details: lastApprovalRequired.details,
      },
    });
    edges.push({
      id:       `e_${parentAgent}_appr`,
      source:   `agent_${parentAgent}`,
      target:   `approval_${lastApprovalRequired.approvalId}`,
      animated: isPending,
    });
  }

  // 5. Final answer node when the workflow has completed.
  if (run.status === "completed") {
    nodes.push({
      id: "final",
      type: "openclaw",
      position: { x: 240, y: ROW_Y.final },
      data: {
        label:   "Final Answer",
        kind:    "final",
        status:  "complete",
        details: run.finalAnswer?.slice(0, 120),
      },
    });
    edges.push({ id: "e_orch_final", source: "orch", target: "final" });
  } else if (run.status === "failed") {
    nodes.push({
      id: "final",
      type: "openclaw",
      position: { x: 240, y: ROW_Y.final },
      data: {
        label:   "Failed",
        kind:    "final",
        status:  "failed",
        details: run.error,
      },
    });
    edges.push({ id: "e_orch_final", source: "orch", target: "final" });
  }

  return { nodes, edges };
}

function orchestratorStatus(run: WorkflowRun): NodeStatus {
  if (run.status === "completed")          return "complete";
  if (run.status === "failed")             return "failed";
  if (run.status === "awaiting_approval")  return "awaiting_approval";
  if (run.status === "running")            return "running";
  return "idle";
}

function agentStatus(run: WorkflowRun, agent: AgentName): NodeStatus {
  // Find the latest event for this agent.
  let lastStart  = -1;
  let lastDone   = -1;
  let pendingApproval = false;
  run.events.forEach((e, i) => {
    if (!("agent" in e)) return;
    if (e.agent !== agent) return;
    if (e.type === "agent.start") lastStart = i;
    if (e.type === "agent.done")  lastDone  = i;
    if (e.type === "approval.required") pendingApproval = true;
  });
  // Was the approval resolved later? Check approval.resolved events.
  if (pendingApproval) {
    const lastApprForAgent = [...run.events]
      .reverse()
      .find((e) => e.type === "approval.required" && e.agent === agent);
    if (lastApprForAgent && lastApprForAgent.type === "approval.required") {
      const resolved = run.events.some((e) =>
        e.type === "approval.resolved" && e.approvalId === lastApprForAgent.approvalId,
      );
      if (!resolved) return "awaiting_approval";
    }
  }
  if (lastDone >= 0 && lastDone > lastStart) return "complete";
  if (lastStart >= 0)                         return "running";
  return "idle";
}
