/**
 * Unit checks for workflow-store + memory recall.
 * Run: npx tsx scripts/smoke-memory.ts
 *
 * localStorage is undefined in Node, so the lib falls through to
 * its in-memory cache — perfect for testing the business logic.
 */

import {
  appendEvent,
  clearWorkflowHistory,
  completeWorkflow,
  failWorkflow,
  loadWorkflows,
  startWorkflow,
} from "../src/lib/workflow-store.ts";
import { recallMemory, searchWorkflows } from "../src/lib/memory.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

clearWorkflowHistory();

// 1. Empty state
check("starts empty", loadWorkflows().length === 0);
check("recall on empty fixtures still works (cross-fixture)",
      recallMemory("alpha").length > 0);

// 2. startWorkflow
const run = startWorkflow("Schedule a team sync next week");
check("startWorkflow assigns id",       typeof run.id === "string" && run.id.length > 0);
check("startWorkflow status running",   run.status === "running");
check("history grew to 1",              loadWorkflows().length === 1);
check("agentsUsed empty initially",     run.agentsUsed.length === 0);

// 3. appendEvent — agent.start adds agent to agentsUsed
appendEvent(run.id, { type: "agent.start", agent: "Calendar", reason: "checking availability" });
{
  const r = loadWorkflows().find((x) => x.id === run.id)!;
  check("agentsUsed contains Calendar",  r.agentsUsed.includes("Calendar"));
  check("events len 1",                   r.events.length === 1);
}

// 4. tool.call + tool.result
appendEvent(run.id, { type: "tool.call",   agent: "Calendar", tool: "findSlots", args: { range: "next-week" } });
appendEvent(run.id, { type: "tool.result", agent: "Calendar", tool: "findSlots", result: { slots: ["Tue 10am", "Wed 2pm"] } });

// 5. approval flips status
appendEvent(run.id, {
  type: "approval.required",
  agent: "Approval",
  action: "send_calendar_invite",
  details: "Send invite to Sarah & Mike for Tue 10am",
  approvalId: "ap_test_1",
});
{
  const r = loadWorkflows().find((x) => x.id === run.id)!;
  check("status -> awaiting_approval", r.status === "awaiting_approval");
}

appendEvent(run.id, { type: "approval.resolved", approvalId: "ap_test_1", decision: "approve", resolvedBy: "user" });
{
  const r = loadWorkflows().find((x) => x.id === run.id)!;
  check("status -> running again", r.status === "running");
}

// 6. completeWorkflow
completeWorkflow(run.id, "Scheduled team sync for Tuesday at 10am.");
{
  const r = loadWorkflows().find((x) => x.id === run.id)!;
  check("status -> completed",     r.status === "completed");
  check("finalAnswer recorded",    r.finalAnswer === "Scheduled team sync for Tuesday at 10am.");
  check("finishedAt set",          typeof r.finishedAt === "string");
  check("workflow.complete event appended",
        r.events.at(-1)?.type === "workflow.complete");
}

// 7. recallMemory finds the past run
{
  const hits = recallMemory("team sync");
  const wf = hits.filter((h) => h.source === "workflow");
  check("recallMemory finds past workflow by query", wf.length >= 1);

  const wf2 = searchWorkflows("Tuesday");
  check("searchWorkflows finds run by finalAnswer text", wf2.length >= 1);
}

// 8. failWorkflow
const r2 = startWorkflow("Send weekly status update");
failWorkflow(r2.id, "OpenAI rate limit exceeded");
{
  const r = loadWorkflows().find((x) => x.id === r2.id)!;
  check("failed status",    r.status === "failed");
  check("error stored",     r.error === "OpenAI rate limit exceeded");
}

// 9. mixed recall
{
  const hits = recallMemory("alpha");
  const sources = new Set(hits.map((h) => h.source));
  check("mixed recall covers fixture sources",
        sources.has("calendar") || sources.has("email") || sources.has("slack") || sources.has("github"),
        `sources: ${[...sources].join(",")}`);
}

console.log(process.exitCode ? "\n[smoke] FAIL" : "\n[smoke] PASS");
