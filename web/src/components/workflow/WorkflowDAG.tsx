"use client";

/**
 * Workflow DAG visualization built on @xyflow/react. Renders the
 * orchestrator graph for a single WorkflowRun: User -> Orchestrator
 * -> Specialists -> [Approval] -> Final.
 *
 * Custom node renderer matches the OpenClaw screenshot 01_1 — colored
 * border by status, icon by kind, optional details line.
 */

import { useMemo } from "react";
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Brain,
  CheckCircle2,
  Calendar as CalIcon,
  Feather,
  GitPullRequest,
  Hash,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import {
  buildDAG,
  type DAGNodeData,
  type NodeStatus,
} from "@/lib/workflow-dag";
import type { WorkflowRun } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

interface Props { run: WorkflowRun }

export function WorkflowDAG({ run }: Props) {
  const { nodes, edges } = useMemo(() => {
    const dag = buildDAG(run);
    return {
      nodes: dag.nodes.map((n) => ({ ...n })),
      edges: dag.edges.map((e) => ({
        ...e,
        type:        "smoothstep" as const,
        markerEnd:   { type: MarkerType.ArrowClosed, color: "#374151" },
        style:       { stroke: e.animated ? "#06b6d4" : "#374151", strokeWidth: 1.5 },
      })),
    };
  }, [run]);

  return (
    <div style={{ height: 580 }} className="bg-page rounded-md border border-line">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ openclaw: AgentNode }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
      >
        <Background color="#1f2937" gap={20} />
      </ReactFlow>
    </div>
  );
}

function AgentNode({ data }: { data: DAGNodeData }) {
  const tone = STATUS_TONE[data.status];
  const Icon = iconFor(data);
  return (
    <div
      className={cn(
        "rounded-md border bg-card text-fg shadow-sm min-w-[180px] max-w-[220px]",
        tone.border,
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-line !border-line" />
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center justify-center size-6 rounded", tone.iconBg)}>
            <Icon className={cn("size-3.5", tone.iconColor)} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider">{data.label}</span>
          <StatusPill status={data.status} className="ml-auto" />
        </div>
        {data.details && (
          <p className="text-[11px] text-muted line-clamp-2 leading-snug">{data.details}</p>
        )}
        {(data.toolCalls ?? 0) > 0 && (
          <div className="text-[10px] text-dim font-mono tabular-nums">
            {data.toolCalls} tool call{data.toolCalls === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-line !border-line" />
    </div>
  );
}

function StatusPill({ status, className }: { status: NodeStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", tone.pill, className)}>
      {status === "awaiting_approval" ? "PENDING" : status === "running" ? "ACTIVE" : status}
    </span>
  );
}

interface Tone {
  border:    string;
  iconBg:    string;
  iconColor: string;
  pill:      string;
}
const STATUS_TONE: Record<NodeStatus, Tone> = {
  idle:              { border: "border-line",      iconBg: "bg-elevated",  iconColor: "text-muted", pill: "bg-elevated text-muted" },
  running:           { border: "border-info/50",   iconBg: "bg-info/15",   iconColor: "text-info",  pill: "bg-info/20 text-info" },
  complete:          { border: "border-ok/50",     iconBg: "bg-ok/15",     iconColor: "text-ok",    pill: "bg-ok/20 text-ok" },
  failed:            { border: "border-err/50",    iconBg: "bg-err/15",    iconColor: "text-err",   pill: "bg-err/20 text-err" },
  awaiting_approval: { border: "border-warn/60",   iconBg: "bg-warn/15",   iconColor: "text-warn",  pill: "bg-warn/20 text-warn" },
};

function iconFor(data: DAGNodeData): React.ComponentType<{ className?: string }> {
  if (data.kind === "user")         return User;
  if (data.kind === "orchestrator") return Feather;
  if (data.kind === "approval")     return CheckCircle2;
  if (data.kind === "final")        return Sparkles;
  switch (data.agentName) {
    case "Calendar": return CalIcon;
    case "Slack":    return Hash;
    case "GitHub":   return GitPullRequest;
    case "Email":    return Mail;
    case "Memory":   return Brain;
    default:         return Sparkles;
  }
}
