"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar as CalIcon,
  CheckCircle2,
  ChevronRight,
  Feather,
  GitPullRequest,
  Hash,
  Loader2,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { Card } from "@/components/Card";
import type { AgentName, WorkflowEvent } from "@/lib/workflow-store";
import type { FeedEntry } from "@/lib/logs";
import { cn } from "@/lib/cn";

interface Props { entries: FeedEntry[] }

export function ActivityFeed({ entries }: Props) {
  return (
    <Card title="Activity Log">
      {entries.length === 0 ? (
        <p className="p-6 text-sm text-muted">
          No activity yet &mdash; run a workflow and events will land here in real time.
        </p>
      ) : (
        <ul className="divide-y divide-line/40">
          {entries.map((e) => <Row key={`${e.runId}:${e.event.id}`} entry={e} />)}
        </ul>
      )}
    </Card>
  );
}

function Row({ entry }: { entry: FeedEntry }) {
  const ev = entry.event;
  const Icon = iconFor(ev);
  const tone = toneFor(ev);
  const time = new Date(ev.ts).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <li className="px-4 py-3 hover:bg-elevated/40 transition-colors">
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex items-center justify-center size-7 rounded shrink-0", tone.bg)}>
          <Icon className={cn("size-3.5", tone.fg)} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[11px] text-dim font-mono tabular-nums shrink-0">{time}</span>
            {"agent" in ev && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-fg">
                {ev.agent}
              </span>
            )}
            <span className="text-xs text-fg leading-snug">{describe(ev)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Link
              href={`/workflows/${entry.runId}`}
              className="text-[11px] text-accent hover:underline inline-flex items-center gap-1"
            >
              {entry.query.length > 60 ? entry.query.slice(0, 60) + "…" : entry.query}
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function describe(ev: WorkflowEvent): string {
  switch (ev.type) {
    case "agent.start":         return ev.reason ?? "started";
    case "agent.message":       return ev.text.length > 120 ? ev.text.slice(0, 120) + "…" : ev.text;
    case "agent.done":          return "completed task";
    case "tool.call":           return `calling ${ev.tool}`;
    case "tool.result":         return `${ev.tool} returned`;
    case "approval.required":   return `approval requested for ${ev.action}`;
    case "approval.resolved":   return `approval ${ev.decision}`;
    case "workflow.complete":   return "workflow completed";
    case "workflow.failed":     return `workflow failed — ${ev.error}`;
  }
}

function iconFor(ev: WorkflowEvent): React.ComponentType<{ className?: string }> {
  switch (ev.type) {
    case "agent.start":         return iconForAgent("agent" in ev ? ev.agent : undefined);
    case "agent.message":
    case "agent.done":          return iconForAgent("agent" in ev ? ev.agent : undefined);
    case "tool.call":
    case "tool.result":         return iconForAgent("agent" in ev ? ev.agent : undefined);
    case "approval.required":   return ShieldCheck;
    case "approval.resolved":   return CheckCircle2;
    case "workflow.complete":   return CheckCircle2;
    case "workflow.failed":     return AlertTriangle;
  }
}

function iconForAgent(name: AgentName | undefined) {
  switch (name) {
    case "Calendar": return CalIcon;
    case "Slack":    return Hash;
    case "GitHub":   return GitPullRequest;
    case "Email":    return Mail;
    case "Memory":   return Brain;
    case "Orchestrator": return Feather;
    default:         return User;
  }
}

function toneFor(ev: WorkflowEvent): { bg: string; fg: string } {
  switch (ev.type) {
    case "agent.start":         return { bg: "bg-info/15",   fg: "text-info" };
    case "tool.call":           return { bg: "bg-accent/15", fg: "text-accent" };
    case "tool.result":         return { bg: "bg-ok/15",     fg: "text-ok" };
    case "agent.message":       return { bg: "bg-elevated",  fg: "text-muted" };
    case "agent.done":          return { bg: "bg-ok/15",     fg: "text-ok" };
    case "approval.required":   return { bg: "bg-warn/15",   fg: "text-warn" };
    case "approval.resolved":   return { bg: "bg-ok/15",     fg: "text-ok" };
    case "workflow.complete":   return { bg: "bg-ok/15",     fg: "text-ok" };
    case "workflow.failed":     return { bg: "bg-err/15",    fg: "text-err" };
  }
}

// Suppress unused-import warnings; these are kept available for future
// per-event icon overrides.
void ChevronRight; void Loader2;
