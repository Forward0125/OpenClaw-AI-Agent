/**
 * Pure helpers for the Activity Log + Context rail.
 * No persistence; consumes the workflow store and shapes data.
 */

import type { WorkflowEvent, WorkflowRun } from "./workflow-store";

export interface FeedEntry {
  runId:    string;
  query:    string;
  event:    WorkflowEvent;
}

/** Flatten every event across every run, newest first. */
export function buildFeed(runs: WorkflowRun[], limit = 200): FeedEntry[] {
  const all: FeedEntry[] = [];
  for (const r of runs) {
    for (const ev of r.events) all.push({ runId: r.id, query: r.query, event: ev });
  }
  all.sort((a, b) => Date.parse(b.event.ts) - Date.parse(a.event.ts));
  return all.slice(0, limit);
}

export interface PerformanceMetrics {
  total:        number;
  completed:    number;
  failed:       number;
  awaiting:     number;
  running:      number;
  successRate:  number;       // 0..1, completed / (completed + failed)
  avgDurationS: number | null;// mean (finishedAt - startedAt) over completed runs
  totalEvents:  number;
}

export function computeMetrics(runs: WorkflowRun[]): PerformanceMetrics {
  let completed = 0, failed = 0, awaiting = 0, running = 0;
  let totalEvents = 0;
  let durSum = 0, durCount = 0;

  for (const r of runs) {
    totalEvents += r.events.length;
    if (r.status === "completed")          completed++;
    else if (r.status === "failed")        failed++;
    else if (r.status === "awaiting_approval") awaiting++;
    else if (r.status === "running")       running++;

    if (r.status === "completed" && r.finishedAt) {
      const d = (Date.parse(r.finishedAt) - Date.parse(r.startedAt)) / 1000;
      if (Number.isFinite(d) && d >= 0) {
        durSum += d;
        durCount++;
      }
    }
  }

  const denom = completed + failed;
  return {
    total:        runs.length,
    completed, failed, awaiting, running,
    successRate:  denom > 0 ? completed / denom : 0,
    avgDurationS: durCount > 0 ? durSum / durCount : null,
    totalEvents,
  };
}

/** Per-agent tool-call counts. Drives the "Tool Usage" breakdown. */
export function computeToolUsage(runs: WorkflowRun[]): Record<string, number> {
  const usage: Record<string, number> = {};
  for (const r of runs) {
    for (const ev of r.events) {
      if (ev.type !== "tool.call") continue;
      usage[ev.agent] = (usage[ev.agent] ?? 0) + 1;
    }
  }
  return usage;
}
