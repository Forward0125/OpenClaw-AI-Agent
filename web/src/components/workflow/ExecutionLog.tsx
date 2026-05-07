"use client";

/**
 * Real-time Execution Log — chronological list of every WorkflowEvent
 * the engine emitted. Mirrors the bottom panel of screenshot 01_1.
 *
 * Compact mono format with agent/tool labels + timestamps. Newest at
 * the bottom (the user's eye follows the live tail down).
 */

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { AgentName, WorkflowEvent } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

interface Props { events: WorkflowEvent[] }

export function ExecutionLog({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-muted py-6 px-4">
        Waiting for the first event&hellip;
      </p>
    );
  }
  return (
    <ul className="space-y-1 font-mono text-[11px] py-2 max-h-80 overflow-y-auto">
      {events.map((ev) => <Row key={ev.id} ev={ev} />)}
    </ul>
  );
}

function Row({ ev }: { ev: WorkflowEvent }) {
  const time = formatTime(ev.ts);
  const agent = "agent" in ev ? ev.agent : undefined;
  const Icon  = iconFor(ev);
  const tone  = toneFor(ev);

  return (
    <li className="flex items-start gap-2 px-4 py-1 hover:bg-elevated/40 transition-colors">
      <span className="text-dim shrink-0">[{time}]</span>
      <Icon className={cn("size-3 shrink-0 mt-0.5", tone)} />
      {agent && <span className="text-fg shrink-0">{agentLabel(agent)}</span>}
      <span className="text-dim">:</span>
      <span className="text-muted leading-snug break-words">{summarize(ev)}</span>
    </li>
  );
}

// ─── Per-event helpers ────────────────────────────────────────────

function summarize(ev: WorkflowEvent): string {
  switch (ev.type) {
    case "agent.start":
      return ev.reason ? `analyzing — ${ev.reason}` : "analyzing request";
    case "agent.message":
      return ev.text.length > 200 ? `${ev.text.slice(0, 200)}…` : ev.text;
    case "agent.done":
      return ev.summary ? `done — ${ev.summary.slice(0, 160)}` : "done";
    case "tool.call":
      return `calling ${ev.tool}(${compactArgs(ev.args)})`;
    case "tool.result":
      return `${ev.tool} -> ${compactResult(ev.result)}`;
    case "approval.required":
      return `APPROVAL required: ${ev.action} — ${ev.details}`;
    case "approval.resolved":
      return `approval ${ev.decision} (${ev.approvalId})`;
    case "workflow.complete":
      return "workflow complete";
    case "workflow.failed":
      return `FAILED: ${ev.error}`;
  }
}

function compactArgs(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const entries = Object.entries(args as Record<string, unknown>);
  const compact = entries.slice(0, 2).map(([k, v]) => {
    const s = typeof v === "string" ? `"${v.slice(0, 30)}${v.length > 30 ? "..." : ""}"` : String(v).slice(0, 30);
    return `${k}: ${s}`;
  }).join(", ");
  return entries.length > 2 ? `${compact}, ...` : compact;
}

function compactResult(result: unknown): string {
  if (!result || typeof result !== "object") return String(result).slice(0, 80);
  const r = result as Record<string, unknown>;
  if ("error" in r)   return `error ${String(r.error).slice(0, 80)}`;
  if ("slots" in r)   return `${(r.slots as unknown[])?.length ?? 0} slots`;
  if ("messages" in r) return `${(r.messages as unknown[])?.length ?? 0} messages`;
  if ("emails" in r)  return `${(r.emails as unknown[])?.length ?? 0} emails`;
  if ("items" in r)   return `${(r.items as unknown[])?.length ?? 0} items`;
  if ("hits" in r)    return `${(r.hits as unknown[])?.length ?? 0} hits`;
  if ("people" in r)  return `${(r.people as unknown[])?.length ?? 0} people`;
  if ("ok" in r)      return `ok`;
  if ("draft" in r)   return `draft prepared`;
  if ("event" in r)   return `event created`;
  if ("answer" in r)  return `answer ready`;
  return JSON.stringify(r).slice(0, 80);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function agentLabel(name: AgentName): string {
  return name.toUpperCase();
}

function iconFor(ev: WorkflowEvent): React.ComponentType<{ className?: string }> {
  switch (ev.type) {
    case "agent.start":         return Loader2;
    case "agent.message":       return ChevronRight;
    case "agent.done":          return CheckCircle2;
    case "tool.call":           return ChevronRight;
    case "tool.result":         return CheckCircle2;
    case "approval.required":   return ShieldCheck;
    case "approval.resolved":   return CheckCircle2;
    case "workflow.complete":   return CheckCircle2;
    case "workflow.failed":     return AlertTriangle;
  }
  return ChevronRight;
}

function toneFor(ev: WorkflowEvent): string {
  switch (ev.type) {
    case "agent.start":         return "text-info";
    case "tool.call":           return "text-accent";
    case "tool.result":         return "text-ok";
    case "agent.done":          return "text-ok";
    case "approval.required":   return "text-warn";
    case "approval.resolved":   return "text-ok";
    case "workflow.complete":   return "text-ok";
    case "workflow.failed":     return "text-err";
  }
  return "text-muted";
}

