"use client";

/**
 * Workflow detail view — DAG + Execution Log + Final Answer.
 * Auto-streams /api/run if the run hasn't started yet.
 */

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { ApprovalCard } from "@/components/workflow/ApprovalCard";
import { Card } from "@/components/Card";
import { ExecutionLog } from "@/components/workflow/ExecutionLog";
import { WorkflowDAG } from "@/components/workflow/WorkflowDAG";
import { useWorkflowRunner } from "@/hooks/useWorkflowRunner";
import { useWorkflows } from "@/hooks/useWorkflows";
import { cn } from "@/lib/cn";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const runs = useWorkflows();
  const run  = runs.find((r) => r.id === id);

  // Stream /api/run only when:
  //   - the run exists (was created by the form)
  //   - no events have arrived yet (i.e. we haven't streamed before)
  //   - status is still "running" (server hasn't reached terminal)
  const shouldStream = useMemo(() => {
    if (!run) return false;
    if (run.events.length > 0) return false;
    return run.status === "running";
  }, [run]);

  const runner = useWorkflowRunner({
    runId:   run?.id ?? "",
    query:   run?.query ?? "",
    enabled: shouldStream,
  });

  if (!run) {
    return (
      <div className="max-w-3xl">
        <Link href="/workflows" className="text-sm text-muted hover:text-fg inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="size-3.5" /> All Workflows
        </Link>
        <Card title="Workflow not found">
          <div className="p-6 text-sm text-muted">
            No run with id <code className="text-fg">{id}</code>. It may have been cleared from history.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/workflows" className="text-sm text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft className="size-3.5" /> All Workflows
      </Link>

      <Card
        title={
          <div className="space-y-1">
            <div className="text-[10px] tracking-widest text-dim uppercase">Workflow Execution</div>
            <div className="text-sm text-fg font-medium leading-snug">{run.query}</div>
          </div>
        }
        action={<RunStatusPill status={run.status} streamerStatus={runner.status} />}
      >
        <WorkflowDAG run={run} />
      </Card>

      {run.status === "completed" && run.finalAnswer && (
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-ok" />
              Final Answer
            </span>
          }
        >
          <div className="p-4 text-sm text-fg whitespace-pre-wrap leading-relaxed">
            {run.finalAnswer}
          </div>
        </Card>
      )}

      {run.status === "failed" && (
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="size-3.5 text-err" />
              Workflow Failed
            </span>
          }
        >
          <div className="p-4 text-sm text-down whitespace-pre-wrap">
            {run.error ?? "Unknown failure."}
          </div>
        </Card>
      )}

      {run.status === "awaiting_approval" && <ApprovalCard run={run} />}

      <Card title="Real-time Execution Log">
        <ExecutionLog events={run.events} />
      </Card>
    </div>
  );
}

function RunStatusPill({
  status,
  streamerStatus,
}: {
  status:         string;
  streamerStatus: "idle" | "streaming" | "done" | "error";
}) {
  let text = status.toUpperCase();
  let tone = "bg-elevated text-muted";
  if (streamerStatus === "streaming")            { text = "STREAMING"; tone = "bg-info/20 text-info"; }
  else if (status === "completed")               { tone = "bg-ok/20 text-ok"; }
  else if (status === "failed")                  { tone = "bg-err/20 text-err"; }
  else if (status === "awaiting_approval")       { text = "AWAITING APPROVAL"; tone = "bg-warn/20 text-warn"; }
  else if (status === "running")                 { tone = "bg-info/20 text-info"; }
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded", tone)}>
      {text}
    </span>
  );
}
