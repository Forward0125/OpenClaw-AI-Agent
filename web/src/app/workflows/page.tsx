"use client";

/**
 * Workflows index — new-workflow form + list of past runs.
 * Click a row to open its execution view.
 */

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/Card";
import { NewWorkflowForm } from "@/components/workflow/NewWorkflowForm";
import { useWorkflows } from "@/hooks/useWorkflows";
import { clearWorkflowHistory, type WorkflowRun, type WorkflowStatus } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

export default function Page() {
  const runs = useWorkflows();

  function onClear() {
    if (runs.length === 0) return;
    if (window.confirm(`Clear all ${runs.length} workflow${runs.length === 1 ? "" : "s"} from history?`)) {
      clearWorkflowHistory();
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <NewWorkflowForm />

      <Card
        title="Past Workflows"
        action={
          runs.length > 0
            ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-down transition-colors"
              >
                <Trash2 className="size-3" /> Clear
              </button>
            )
            : null
        }
      >
        {runs.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No runs yet. Start a workflow above &mdash; it&rsquo;ll appear here.
          </p>
        ) : (
          <ul className="divide-y divide-line/50">
            {runs.map((run) => <Row key={run.id} run={run} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ run }: { run: WorkflowRun }) {
  return (
    <li>
      <Link
        href={`/workflows/${run.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 transition-colors"
      >
        <StatusBadge status={run.status} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-fg truncate">{run.query}</div>
          <div className="text-[11px] text-dim mt-0.5 font-mono tabular-nums">
            {timeAgo(run.startedAt)}
            {run.agentsUsed.length > 0 && (
              <span className="ml-2 text-muted">
                {run.agentsUsed.length} agent{run.agentsUsed.length === 1 ? "" : "s"}
                {": "}
                <span className="text-fg">{run.agentsUsed.join(", ")}</span>
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="size-4 text-dim" />
      </Link>
    </li>
  );
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const map: Record<WorkflowStatus, { Icon: React.ComponentType<{ className?: string }>; tone: string; label: string }> = {
    running:           { Icon: Loader2,       tone: "text-info animate-spin",  label: "RUNNING" },
    awaiting_approval: { Icon: ShieldCheck,   tone: "text-warn",                label: "PENDING" },
    completed:         { Icon: CheckCircle2,  tone: "text-ok",                  label: "DONE" },
    failed:            { Icon: AlertCircle,   tone: "text-err",                 label: "FAILED" },
    cancelled:         { Icon: AlertCircle,   tone: "text-muted",               label: "CANCELLED" },
  };
  const { Icon, tone, label } = map[status];
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 w-16">
      <Icon className={cn("size-4", tone)} />
      <span className="text-[9px] uppercase tracking-wider text-dim">{label}</span>
    </div>
  );
}

function timeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (sec < 60)         return `${sec}s ago`;
  if (sec < 3600)       return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)      return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
