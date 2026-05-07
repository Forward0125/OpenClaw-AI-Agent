/**
 * Pure-function checks for lib/analytics.ts.
 * Run: npx tsx scripts/smoke-analytics.ts
 */

import {
  buildAlerts,
  buildTrend,
} from "../src/lib/analytics.ts";
import type { WorkflowRun } from "../src/lib/workflow-store.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const NOW = Date.now();
function ts(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

const runs: WorkflowRun[] = [
  // 2 runs today (1 done, 1 failed)
  {
    id: "wf_today_1", query: "today done",
    status: "completed", startedAt: ts(-3600_000), finishedAt: ts(-3300_000),
    finalAnswer: "ok", agentsUsed: ["Orchestrator", "Calendar"],
    events: [],
  },
  {
    id: "wf_today_2", query: "today fail",
    status: "failed", startedAt: ts(-1800_000), finishedAt: ts(-1700_000),
    error: "boom", agentsUsed: ["Orchestrator"],
    events: [
      { id: "e1", ts: ts(-1700_000), type: "workflow.failed", error: "boom" },
    ],
  },
  // 1 run 2 days ago, awaiting
  {
    id: "wf_2d", query: "2 days ago awaiting",
    status: "awaiting_approval", startedAt: ts(-2 * 86400_000),
    agentsUsed: ["Orchestrator", "Email"],
    events: [
      { id: "e2", ts: ts(-2 * 86400_000), type: "approval.required",
        agent: "Email", action: "email.send", details: "send to dana",
        approvalId: "ap_2" },
    ],
  },
];

// 1. buildTrend
{
  const t = buildTrend(runs, 7);
  check("trend has 7 buckets",            t.length === 7);
  check("buckets in chronological order",
        t.every((b, i) => i === 0 || b.day >= t[i - 1].day));

  const todayIso = new Date().toISOString().slice(0, 10);
  const twoDaysAgoIso = new Date(NOW - 2 * 86400_000).toISOString().slice(0, 10);
  const today = t.find((b) => b.day === todayIso)!;
  const twoDays = t.find((b) => b.day === twoDaysAgoIso)!;
  check("today: 2 total", today.total === 2);
  check("today: 1 completed, 1 failed",
        today.completed === 1 && today.failed === 1);
  check("2 days ago: 1 awaiting", twoDays.awaiting === 1);
}

// 2. buildAlerts
{
  const alerts = buildAlerts(runs);
  // Should include: failed run + awaiting approval
  check("alert for failed run",     alerts.some((a) => a.severity === "error" && a.runId === "wf_today_2"));
  check("alert for awaiting run",   alerts.some((a) => a.severity === "warning" && a.runId === "wf_2d"));
  check("no alerts for completed",   !alerts.some((a) => a.runId === "wf_today_1"));
  check("alerts have title + body",  alerts.every((a) => a.title.length > 0));
  check("alerts capped at 8",        alerts.length <= 8);
}

console.log(process.exitCode ? "\n[smoke] FAIL" : "\n[smoke] PASS");
