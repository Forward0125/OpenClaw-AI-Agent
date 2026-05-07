"use client";

/**
 * /approvals — global view of every workflow waiting on a human gate.
 * Each row inlines the same Approve / Decline buttons as the workflow
 * detail page, so a recruiter can resolve a queue from one place.
 */

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/Card";
import { ApprovalCard, pendingApprovalFor } from "@/components/workflow/ApprovalCard";
import { useWorkflows } from "@/hooks/useWorkflows";

export default function Page() {
  const runs = useWorkflows();
  const pending = runs.filter((r) => r.status === "awaiting_approval" && pendingApprovalFor(r));

  return (
    <div className="space-y-6 max-w-3xl">
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-warn" />
            Pending Approvals
          </span>
        }
      >
        {pending.length === 0 ? (
          <div className="p-6 text-sm text-muted space-y-2">
            <p>No approvals waiting.</p>
            <p>
              <Link href="/workflows" className="text-accent hover:underline inline-flex items-center gap-1">
                Start a new workflow <ArrowRight className="size-3" />
              </Link>
              {" "}to see one in action. Try{" "}
              <em className="text-fg">&ldquo;Send a status update to #product&rdquo;</em>{" "}
              &mdash; the Email or Slack agent will pause here.
            </p>
          </div>
        ) : (
          <ul className="p-3 space-y-3">
            {pending.map((run) => (
              <li key={run.id}>
                <div className="px-1 mb-1.5 text-xs text-muted truncate">
                  Workflow: <span className="text-fg">{run.query}</span>
                </div>
                <ApprovalCard run={run} compact />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-[11px] text-dim">
        Approvals are per-browser via <code className="text-muted">localStorage</code>.
        Closing this tab and reopening it tomorrow keeps the queue intact &mdash; the
        engine state is fully serializable.
      </p>
    </div>
  );
}
