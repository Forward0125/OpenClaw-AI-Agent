"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/Card";
import type { WorkflowRun, WorkflowStatus } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

interface Props { runs: WorkflowRun[] }

export function RecentActivity({ runs }: Props) {
  const recent = runs.slice(0, 8);
  return (
    <Card
      title="Recent Activity Log"
      action={
        <Link href="/workflows" className="text-[11px] text-muted hover:text-fg inline-flex items-center gap-1">
          All workflows <ArrowRight className="size-3" />
        </Link>
      }
    >
      {recent.length === 0 ? (
        <p className="p-6 text-sm text-muted">
          No workflows yet. Start one from the sidebar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-dim border-b border-line">
                <th className="text-left  py-2 px-3">Started</th>
                <th className="text-left  py-2 px-3">Task</th>
                <th className="text-left  py-2 px-3">Status</th>
                <th className="text-left  py-2 px-3">Agents</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((run) => <Row key={run.id} run={run} />)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Row({ run }: { run: WorkflowRun }) {
  return (
    <tr className="border-b border-line/40 hover:bg-elevated/40 transition-colors">
      <td className="py-2 px-3 text-muted font-mono tabular-nums whitespace-nowrap">
        {fmtTime(run.startedAt)}
      </td>
      <td className="py-2 px-3 text-fg truncate max-w-[280px]">{run.query}</td>
      <td className="py-2 px-3">
        <StatusPill status={run.status} />
      </td>
      <td className="py-2 px-3 text-muted text-[11px]">
        {run.agentsUsed.length === 0 ? "—" : run.agentsUsed.join(", ")}
      </td>
      <td className="py-2 px-3">
        <Link
          href={`/workflows/${run.id}`}
          className="text-accent hover:text-fg inline-flex items-center"
        >
          <ArrowRight className="size-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: WorkflowStatus }) {
  const map: Record<WorkflowStatus, { Icon: React.ComponentType<{ className?: string }>; tone: string; label: string }> = {
    running:           { Icon: Loader2,      tone: "bg-info/15 text-info",   label: "Running" },
    awaiting_approval: { Icon: ShieldCheck,  tone: "bg-warn/15 text-warn",   label: "Pending" },
    completed:         { Icon: CheckCircle2, tone: "bg-ok/15 text-ok",       label: "Done" },
    failed:            { Icon: AlertCircle,  tone: "bg-err/15 text-err",     label: "Failed" },
    cancelled:         { Icon: AlertCircle,  tone: "bg-elevated text-muted", label: "Cancelled" },
  };
  const { Icon, tone, label } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", tone)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {label}
    </span>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
