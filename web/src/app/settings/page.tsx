"use client";

/**
 * Settings — what the demo can actually expose:
 *   - Reset workflow history (wipes runs + paused approvals)
 *   - Clear signal cache (none in this app, but listed for parity)
 *   - About panel
 */

import { Card } from "@/components/Card";
import { useWorkflows } from "@/hooks/useWorkflows";
import { clearWorkflowHistory } from "@/lib/workflow-store";

export default function Page() {
  const runs = useWorkflows();

  function onResetHistory() {
    if (runs.length === 0) return;
    if (!window.confirm(`Clear all ${runs.length} workflow${runs.length === 1 ? "" : "s"} and any paused approvals?`)) return;

    // Also strip any paused EngineState entries.
    if (typeof localStorage !== "undefined") {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("openclaw:paused-state:")) localStorage.removeItem(k);
      }
    }
    clearWorkflowHistory();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card title="Workflow History">
        <div className="p-4 space-y-3 text-sm">
          <Stat label="Stored runs"    value={String(runs.length)} />
          <Stat label="Total events"   value={String(runs.reduce((s, r) => s + r.events.length, 0))} />
          <Stat label="Awaiting approval" value={String(runs.filter((r) => r.status === "awaiting_approval").length)} />
          <button
            type="button"
            onClick={onResetHistory}
            disabled={runs.length === 0}
            className="mt-3 px-3 py-2 rounded text-sm border border-down/30 bg-down/10 text-down hover:bg-down/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reset workflow history
          </button>
        </div>
      </Card>

      <Card title="About OpenClaw">
        <div className="p-4 text-sm text-muted leading-relaxed space-y-2">
          <p>
            OpenClaw AI is an executive-assistant agent that orchestrates 7
            specialists across mock Slack / Calendar / GitHub / Email / SMS,
            with human-in-loop approval before any destructive action runs.
          </p>
          <p>
            <span className="text-fg font-medium">Architecture</span>:{" "}
            Next.js 16 frontend + Vercel Edge serverless API. Orchestration is
            a hand-rolled TypeScript state graph (LangGraph-inspired). LLM is
            OpenAI gpt-4o-mini via a streaming SSE route. State, history, and
            paused approvals all live in <code className="text-fg">localStorage</code>{" "}
            &mdash; per-browser, no backend, no auth.
          </p>
          <p>
            <span className="text-fg font-medium">Production wiring</span>: real
            OAuth connections into Slack / Google Calendar / GitHub / Gmail /
            Twilio drop in behind the same tool surface. The agent code never
            sees a difference.
          </p>
          <p className="text-dim text-[11px] pt-1">
            Portfolio demo. Not a real assistant. Closing this tab and clearing
            cookies wipes everything &mdash; nothing leaves your browser except
            the OpenAI calls themselves.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line/40 pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-mono tabular-nums text-fg">{value}</span>
    </div>
  );
}
