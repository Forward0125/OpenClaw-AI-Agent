/**
 * Pure-function checks for lib/logs.ts.
 * Run: npx tsx scripts/smoke-logs.ts
 */

import {
  buildFeed,
  computeMetrics,
  computeToolUsage,
} from "../src/lib/logs.ts";
import type { WorkflowRun } from "../src/lib/workflow-store.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const NOW = Date.now();
function ts(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

// Build a fixture of 3 runs across all states.
const runs: WorkflowRun[] = [
  {
    id:         "wf_a",
    query:      "Schedule team sync",
    status:     "completed",
    startedAt:  ts(-30_000),
    finishedAt: ts(-22_000),
    finalAnswer: "Scheduled for Tue 10am.",
    agentsUsed: ["Orchestrator", "Calendar"],
    events: [
      { id: "e1", ts: ts(-30_000), type: "agent.start", agent: "Orchestrator" },
      { id: "e2", ts: ts(-29_000), type: "tool.call",   agent: "Orchestrator", tool: "delegate.Calendar", args: {} },
      { id: "e3", ts: ts(-25_000), type: "tool.call",   agent: "Calendar",     tool: "calendar.findSlots", args: {} },
      { id: "e4", ts: ts(-23_000), type: "tool.result", agent: "Calendar",     tool: "calendar.findSlots", result: { slots: [] } },
      { id: "e5", ts: ts(-22_000), type: "workflow.complete", finalAnswer: "Scheduled for Tue 10am." },
    ],
  },
  {
    id:         "wf_b",
    query:      "Send apology to Acme",
    status:     "awaiting_approval",
    startedAt:  ts(-10_000),
    agentsUsed: ["Orchestrator", "Email"],
    events: [
      { id: "e10", ts: ts(-10_000), type: "agent.start", agent: "Orchestrator" },
      { id: "e11", ts: ts(-9_000),  type: "tool.call",   agent: "Email", tool: "email.send", args: {} },
      { id: "e12", ts: ts(-8_500),  type: "approval.required",
        agent: "Email", action: "email.send", details: "Send to dana@acme.example",
        approvalId: "ap_1" },
    ],
  },
  {
    id:         "wf_c",
    query:      "Failing run",
    status:     "failed",
    startedAt:  ts(-5_000),
    finishedAt: ts(-4_000),
    error:      "model timeout",
    agentsUsed: ["Orchestrator"],
    events: [
      { id: "e20", ts: ts(-5_000), type: "agent.start", agent: "Orchestrator" },
      { id: "e21", ts: ts(-4_000), type: "workflow.failed", error: "model timeout" },
    ],
  },
];

// 1. buildFeed
{
  const feed = buildFeed(runs, 200);
  const expected = runs.reduce((sum, r) => sum + r.events.length, 0);
  check("feed includes every event",     feed.length === expected, `${feed.length} vs ${expected}`);
  check("feed is newest-first",
        feed.every((e, i) => i === 0 || Date.parse(feed[i - 1].event.ts) >= Date.parse(e.event.ts)));
  check("each entry carries runId + query",
        feed.every((e) => typeof e.runId === "string" && typeof e.query === "string"));
}

// 2. computeMetrics
{
  const m = computeMetrics(runs);
  check("total = 3",        m.total === 3);
  check("completed = 1",    m.completed === 1);
  check("failed = 1",       m.failed === 1);
  check("awaiting = 1",     m.awaiting === 1);
  check("successRate 50%", Math.abs(m.successRate - 0.5) < 1e-9);
  check("avgDuration 8s",   m.avgDurationS !== null && Math.abs(m.avgDurationS - 8) < 1);
  check("totalEvents matches",
        m.totalEvents === runs.reduce((s, r) => s + r.events.length, 0));
}

// 3. computeToolUsage
{
  const u = computeToolUsage(runs);
  // Orchestrator made 1 tool.call (delegate.Calendar in wf_a)
  // Calendar made 1 (calendar.findSlots)
  // Email made 1 (email.send)
  check("Orchestrator: 1 tool call", u.Orchestrator === 1);
  check("Calendar: 1 tool call",     u.Calendar === 1);
  check("Email: 1 tool call",        u.Email === 1);
  check("no spurious agents",
        Object.keys(u).every((a) => ["Orchestrator", "Calendar", "Email"].includes(a)));
}

console.log(process.exitCode ? "\n[smoke] FAIL" : "\n[smoke] PASS");
