/**
 * Analytics helpers for the dashboard. Extends logs.ts with
 * trend computation (last-N-day buckets) and alert digest.
 */

import type { WorkflowRun } from "./workflow-store";
import { computeMetrics, type PerformanceMetrics } from "./logs";

export interface DailyBucket {
  day:           string;        // ISO date "YYYY-MM-DD"
  total:         number;
  completed:     number;
  failed:        number;
  awaiting:      number;
}

/** Last N days (inclusive of today), oldest-first. */
export function buildTrend(runs: WorkflowRun[], days = 7): DailyBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: DailyBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({
      day:        d.toISOString().slice(0, 10),
      total:      0,
      completed:  0,
      failed:     0,
      awaiting:   0,
    });
  }

  for (const run of runs) {
    const bucketIso = run.startedAt.slice(0, 10);
    const b = buckets.find((x) => x.day === bucketIso);
    if (!b) continue;
    b.total++;
    if (run.status === "completed")             b.completed++;
    else if (run.status === "failed")           b.failed++;
    else if (run.status === "awaiting_approval") b.awaiting++;
  }
  return buckets;
}

export interface Alert {
  id:       string;
  severity: "info" | "warning" | "error";
  title:    string;
  body:     string;
  runId?:   string;
}

/** Surface user-actionable alerts: failed runs, pending approvals,
 *  long-running workflows. Newest-first. */
export function buildAlerts(runs: WorkflowRun[]): Alert[] {
  const alerts: Alert[] = [];

  for (const run of runs) {
    if (run.status === "failed" && run.error) {
      alerts.push({
        id:       `alert_fail_${run.id}`,
        severity: "error",
        title:    `Workflow failed: ${truncate(run.query, 50)}`,
        body:     run.error,
        runId:    run.id,
      });
    } else if (run.status === "awaiting_approval") {
      const pending = run.events.find((e) => e.type === "approval.required");
      alerts.push({
        id:       `alert_appr_${run.id}`,
        severity: "warning",
        title:    `Approval needed: ${pending && pending.type === "approval.required" ? pending.action : "unknown"}`,
        body:     pending && pending.type === "approval.required" ? pending.details : "",
        runId:    run.id,
      });
    } else if (run.status === "running") {
      // Stalled detection — running > 60s with no recent event.
      const lastEv = run.events.at(-1);
      const sinceLast = lastEv ? Date.now() - Date.parse(lastEv.ts) : 0;
      if (sinceLast > 60_000) {
        alerts.push({
          id:       `alert_stall_${run.id}`,
          severity: "info",
          title:    `Workflow appears stalled: ${truncate(run.query, 50)}`,
          body:     `No events in ${Math.floor(sinceLast / 1000)}s.`,
          runId:    run.id,
        });
      }
    }
  }

  // Already-newest-first because runs are stored newest-first.
  return alerts.slice(0, 8);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// Re-export the metrics shape so dashboard imports go through here.
export { computeMetrics };
export type { PerformanceMetrics };
