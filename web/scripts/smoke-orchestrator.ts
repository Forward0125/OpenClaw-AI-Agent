/**
 * Engine integration tests with a scripted ModelClient — no OpenAI
 * key needed.
 *
 *   1. Simple delegation: Orchestrator -> Calendar -> respond
 *   2. Approval gate:     Email tries to send -> pause -> resume on approve
 *   3. User declines:     pause -> resume on decline -> error returned to LLM
 *   4. Capability enforcement: Slack agent tries email tool -> rejected
 *
 * Run: npx tsx scripts/smoke-orchestrator.ts
 */

import {
  initState,
  resumeAfterApproval,
  runUntilPause,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type EngineState,
  type ModelClient,
  type ToolCall,
} from "../src/lib/orchestrator.ts";
import { clearWorkflowHistory, startWorkflow, loadWorkflows } from "../src/lib/workflow-store.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

let tcCounter = 0;
function tc(name: string, args: unknown): ToolCall {
  return {
    id:       `call_${++tcCounter}`,
    type:     "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

class ScriptedClient implements ModelClient {
  private idx = 0;
  constructor(private script: ChatResponse[]) {}
  async chat(_req: ChatRequest): Promise<ChatResponse> {
    if (this.idx >= this.script.length) {
      throw new Error(`scripted client ran out of responses at idx ${this.idx}`);
    }
    return this.script[this.idx++];
  }
}

const events: { runId: string; ev: unknown }[] = [];
function recordingOptions(client: ModelClient) {
  events.length = 0;
  return {
    client,
    onEvent: (ev: unknown) => events.push({ runId: "current", ev }),
  };
}

async function main(): Promise<void> {
  // ─── Test 1: simple delegation ────────────────────────────────
  console.log("\n[1] Orchestrator -> Calendar -> respond");
  clearWorkflowHistory();
  {
    const run = startWorkflow("When can I meet with Sarah next week?");
    const client = new ScriptedClient([
      // turn 1: Orchestrator delegates to Calendar
      { content: null, tool_calls: [tc("delegate.Calendar", { instructions: "Find a 30-min slot next week with Sarah." })] },
      // turn 2: Calendar agent calls findSlots
      { content: null, tool_calls: [tc("calendar.findSlots", {
          startDate:    new Date(Date.now() + 86400 * 1000).toISOString(),
          endDate:      new Date(Date.now() + 8 * 86400 * 1000).toISOString(),
          durationMin:  30,
          attendees:    ["jane@openclaw.demo", "sarah@openclaw.demo"],
        })] },
      // turn 3: Calendar agent reports back as text
      { content: "Found 5 free slots. The earliest is the next free 30-min window.", tool_calls: [] },
      // turn 4: Orchestrator calls respond
      { content: null, tool_calls: [tc("respond", { answer: "Sarah is free in several 30-min slots starting next week — easiest is to pick the earliest." })] },
    ]);
    const final = await runUntilPause(initState(run.id, run.query), recordingOptions(client));
    check("status completed",      final.status === "completed");
    check("finalAnswer present",   typeof final.finalAnswer === "string" && final.finalAnswer!.length > 0);
    check("emitted >=4 agent.start events",
          events.filter((e) => (e.ev as { type?: string }).type === "agent.start").length >= 2);
    check("emitted exactly 1 workflow.complete",
          events.filter((e) => (e.ev as { type?: string }).type === "workflow.complete").length === 1);
  }

  // ─── Test 2: approval gate -> approve -> resume ───────────────
  console.log("\n[2] Email -> email.send -> approval gate -> approve");
  clearWorkflowHistory();
  {
    const run = startWorkflow("Send an apology to Acme about the SSO delay.");
    const scripted = [
      // 1. Orchestrator -> delegate.Email
      { content: null, tool_calls: [tc("delegate.Email", { instructions: "Send a short apology to dana.wexler@acmecorp.example about SSO." })] },
      // 2. Email agent: search inbox first
      { content: null, tool_calls: [tc("email.searchInbox", { query: "SSO" })] },
      // 3. Email agent: send (DESTRUCTIVE -> pauses here)
      { content: null, tool_calls: [tc("email.send", {
          to:      ["dana.wexler@acmecorp.example"],
          subject: "Re: Following up on SSO",
          body:    "Hi Dana, sorry for the delay — engineering ETA by Friday.",
        })] },
      // 4. Email agent: reports back AFTER resume
      { content: "Apology email sent to Dana.", tool_calls: [] },
      // 5. Orchestrator: respond
      { content: null, tool_calls: [tc("respond", { answer: "Sent your apology to Dana with a Friday ETA." })] },
    ];
    const client = new ScriptedClient(scripted);
    const opts = recordingOptions(client);
    const paused = await runUntilPause(initState(run.id, run.query), opts);
    check("paused awaiting approval",  paused.status === "awaiting_approval");
    check("pendingApproval populated", paused.pendingApproval?.toolName === "email.send");
    check("emitted approval.required",
          events.some((e) => (e.ev as { type?: string }).type === "approval.required"));

    const final = await resumeAfterApproval(paused, "approve", opts);
    check("status completed after approve",     final.status === "completed");
    check("emitted approval.resolved approve",
          events.some((e) =>
            (e.ev as { type?: string; decision?: string }).type === "approval.resolved" &&
            (e.ev as { decision?: string }).decision === "approve"));
    check("emitted tool.result for email.send after approval",
          events.some((e) => {
            const ev = e.ev as { type?: string; tool?: string };
            return ev.type === "tool.result" && ev.tool === "email.send";
          }));
  }

  // ─── Test 3: approval -> decline ──────────────────────────────
  console.log("\n[3] Approval gate -> decline -> engine returns error to LLM");
  clearWorkflowHistory();
  {
    const run = startWorkflow("Post a kickoff message to #engineering.");
    const client = new ScriptedClient([
      { content: null, tool_calls: [tc("delegate.Slack", { instructions: "Post a launch kickoff in #engineering." })] },
      { content: null, tool_calls: [tc("slack.sendMessage", { channel: "#engineering", text: "Launch kickoff today!" })] },
      // After decline returns the error tool_result, the LLM falls back
      { content: "User declined. Reverting to draft mode.", tool_calls: [] },
      { content: null, tool_calls: [tc("respond", { answer: "Skipped the post per your decline." })] },
    ]);
    const opts = recordingOptions(client);
    const paused = await runUntilPause(initState(run.id, run.query), opts);
    check("paused on slack.sendMessage", paused.status === "awaiting_approval");

    const final = await resumeAfterApproval(paused, "decline", opts);
    check("status completed after decline",  final.status === "completed");
    check("decline event emitted",
          events.some((e) =>
            (e.ev as { type?: string; decision?: string }).type === "approval.resolved" &&
            (e.ev as { decision?: string }).decision === "decline"));
  }

  // ─── Test 4: capability enforcement ───────────────────────────
  console.log("\n[4] Slack agent tries to call email.send -> rejected");
  clearWorkflowHistory();
  {
    const run = startWorkflow("Test capability boundary.");
    const client = new ScriptedClient([
      { content: null, tool_calls: [tc("delegate.Slack", { instructions: "(misbehave)" })] },
      // Slack agent illegally tries email.send
      { content: null, tool_calls: [tc("email.send", { to: ["x@y"], subject: "x", body: "x" })] },
      // Slack agent backs off to text
      { content: "Tool rejected; nothing to send.", tool_calls: [] },
      // Orchestrator finishes
      { content: null, tool_calls: [tc("respond", { answer: "Boundary holds — Slack agent could not call email.send." })] },
    ]);
    const opts = recordingOptions(client);
    const final = await runUntilPause(initState(run.id, run.query), opts);
    check("workflow still completes after capability violation", final.status === "completed");
    // Look for the tool_result message saying not authorized.
    const sawDenial = final.messages.some((m: ChatMessage) =>
      m.role === "tool" && m.name === "email.send" &&
      typeof m.content === "string" && m.content.includes("not authorized"),
    );
    check("engine inserted not-authorized tool result", sawDenial);
    check("workflow did NOT pause for approval (call rejected before gate)",
          !events.some((e) =>
            (e.ev as { type?: string; action?: string }).type === "approval.required" &&
            (e.ev as { action?: string }).action === "email.send"));
  }

  // History sanity — the engine routes events to onEvent (not the
  // store), so only the last startWorkflow survives the clear.
  console.log("\n[history]");
  const runs = loadWorkflows();
  check("startWorkflow records the latest run", runs.length === 1);

  console.log(process.exitCode ? "\n[smoke] FAIL" : "\n[smoke] PASS");
}

main().catch((err) => { console.error("[smoke] error:", err); process.exit(2); });
