"use client";

/**
 * Inline approval card. Appears in the workflow detail view when the
 * orchestrator paused on a destructive tool call. Reads the paused
 * EngineState from localStorage and resumes via /api/run/resume on
 * Approve / Decline click.
 *
 * Compact "shared" version is used by /approvals to list pending
 * approvals across all runs (no DAG context needed).
 */

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { resumePausedRun } from "@/hooks/useWorkflowRunner";
import { loadPausedState, type WorkflowRun } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

interface Props {
  run:        WorkflowRun;
  /** Compact = used in /approvals; expanded = used in workflow detail. */
  compact?:   boolean;
}

export function ApprovalCard({ run, compact = false }: Props) {
  const pending = pendingApprovalFor(run);
  const [busy,  setBusy]  = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!pending) return null;

  async function resolve(decision: "approve" | "decline"): Promise<void> {
    setBusy(decision);
    setError(null);
    try {
      const state = loadPausedState(run.id);
      if (!state) throw new Error("no paused state for this run");
      await resumePausedRun(run.id, state, decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  if (compact) {
    return (
      <div className="rounded border border-warn/30 bg-warn/5 p-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="inline-flex items-center justify-center size-7 rounded bg-warn/15">
          <ShieldCheck className="size-3.5 text-warn" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-fg truncate">
            <span className="font-medium">{pending.agent}</span>
            <span className="text-muted"> wants to </span>
            <span className="font-mono text-warn">{pending.action}</span>
          </div>
          <div className="text-[11px] text-muted truncate">{pending.details}</div>
          <Link
            href={`/workflows/${run.id}`}
            className="text-[11px] text-accent hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            Open workflow <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ResolveBtn variant="approve" onClick={() => resolve("approve")} busy={busy} />
          <ResolveBtn variant="decline" onClick={() => resolve("decline")} busy={busy} />
        </div>
        {error && <div className="col-span-3 text-[11px] text-down">{error}</div>}
      </div>
    );
  }

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-warn" />
          Approval Required
        </span>
      }
    >
      <div className="p-4 space-y-4">
        <div className="rounded border border-warn/30 bg-warn/5 p-3 space-y-2">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-[10px] uppercase tracking-wider font-bold text-warn px-1.5 py-0.5 rounded bg-warn/15">
              {pending.agent}
            </span>
            <span className="text-muted">wants to call</span>
            <code className="text-warn font-mono text-xs">{pending.action}</code>
          </div>
          <p className="text-sm text-fg">{pending.details}</p>
          <ProposedArgs args={pending.args} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => resolve("approve")}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2",
              "bg-ok text-page hover:bg-ok/85 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {busy === "approve"
              ? <><Loader2 className="size-3.5 animate-spin" /> Resuming…</>
              : <><CheckCircle2 className="size-3.5" /> Approve</>}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => resolve("decline")}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2",
              "border border-line bg-elevated hover:bg-card transition-colors text-fg",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {busy === "decline"
              ? <><Loader2 className="size-3.5 animate-spin" /> Resuming…</>
              : <><X className="size-3.5" /> Decline</>}
          </button>
        </div>

        {error && (
          <div className="px-3 py-2 rounded border border-down/30 bg-down/5 text-xs text-fg flex items-start gap-2">
            <AlertCircle className="size-4 text-down shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[11px] text-dim leading-relaxed">
          The agent paused before running this action because it&rsquo;s flagged as
          destructive (modifies real services). Approving runs the action and
          continues the workflow; declining returns an error to the agent so it
          can adapt.
        </p>
      </div>
    </Card>
  );
}

function ResolveBtn({
  variant,
  onClick,
  busy,
}: {
  variant: "approve" | "decline";
  onClick: () => void;
  busy:    "approve" | "decline" | null;
}) {
  const isApprove = variant === "approve";
  const isBusy = busy === variant;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy !== null}
      className={cn(
        "px-2.5 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1",
        isApprove
          ? "bg-ok/15 text-ok hover:bg-ok/25"
          : "bg-elevated text-muted hover:text-fg",
        "disabled:opacity-40",
      )}
    >
      {isBusy
        ? <Loader2 className="size-3 animate-spin" />
        : isApprove
          ? <CheckCircle2 className="size-3" />
          : <X className="size-3" />}
      {isApprove ? "Approve" : "Decline"}
    </button>
  );
}

function ProposedArgs({ args }: { args: unknown }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(args, null, 2);
  if (json.length < 80) {
    return (
      <pre className="text-[11px] font-mono bg-page border border-line/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-muted">
        {json}
      </pre>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] text-accent hover:underline"
      >
        {open ? "Hide" : "Show"} proposed arguments
      </button>
      {open && (
        <pre className="mt-1 text-[11px] font-mono bg-page border border-line/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-muted">
          {json}
        </pre>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

interface PendingInfo {
  approvalId: string;
  agent:      string;
  action:     string;
  details:    string;
  args:       unknown;
}

export function pendingApprovalFor(run: WorkflowRun): PendingInfo | null {
  // Latest approval.required without a matching approval.resolved.
  for (let i = run.events.length - 1; i >= 0; i--) {
    const ev = run.events[i];
    if (ev.type !== "approval.required") continue;
    const resolved = run.events.some((e) => e.type === "approval.resolved" && e.approvalId === ev.approvalId);
    if (resolved) return null;
    // Pull args from the matching tool.call that fired immediately before.
    let args: unknown = undefined;
    for (let j = i - 1; j >= 0; j--) {
      const prev = run.events[j];
      if (prev.type === "tool.call" && "tool" in prev && prev.tool === ev.action) {
        args = prev.args;
        break;
      }
    }
    return {
      approvalId: ev.approvalId,
      agent:      ev.agent,
      action:     ev.action,
      details:    ev.details,
      args,
    };
  }
  return null;
}
