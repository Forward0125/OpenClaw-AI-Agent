"use client";

import Link from "next/link";
import { ArrowRight, Gauge, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/Card";
import { computeMetrics, computeToolUsage } from "@/lib/logs";
import type { AgentName, WorkflowRun } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

interface Props { runs: WorkflowRun[] }

export function ContextRail({ runs }: Props) {
  const metrics = computeMetrics(runs);
  const usage   = computeToolUsage(runs);
  const active  = runs.find((r) => r.status === "running" || r.status === "awaiting_approval") ?? runs[0];

  return (
    <div className="space-y-4">
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" />
            Active Context
          </span>
        }
      >
        <div className="p-4 text-sm">
          {active ? (
            <>
              <p className="text-fg leading-snug">{active.query}</p>
              <div className="mt-2 flex items-baseline gap-2 text-[11px] text-muted">
                <span className="uppercase tracking-wider font-bold">{active.status}</span>
                <span className="text-dim">&middot;</span>
                <span>{active.agentsUsed.length} agent{active.agentsUsed.length === 1 ? "" : "s"}</span>
                {active.agentsUsed.length > 0 && (
                  <span className="text-fg truncate">{active.agentsUsed.join(" + ")}</span>
                )}
              </div>
              <Link
                href={`/workflows/${active.id}`}
                className="mt-2 text-[11px] text-accent hover:underline inline-flex items-center gap-1"
              >
                View workflow <ArrowRight className="size-3" />
              </Link>
            </>
          ) : (
            <p className="text-muted">No workflows yet.</p>
          )}
        </div>
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-warn" />
            Pending Approvals
          </span>
        }
      >
        <div className="p-4 text-sm">
          {metrics.awaiting === 0 ? (
            <p className="text-muted">No approvals waiting.</p>
          ) : (
            <>
              <p className="text-fg">
                <span className="text-2xl font-mono tabular-nums">{metrics.awaiting}</span>
                <span className="text-muted text-xs ml-2">workflow{metrics.awaiting === 1 ? "" : "s"} paused</span>
              </p>
              <Link
                href="/approvals"
                className="mt-2 text-[11px] text-accent hover:underline inline-flex items-center gap-1"
              >
                Review queue <ArrowRight className="size-3" />
              </Link>
            </>
          )}
        </div>
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <Gauge className="size-3.5 text-accent" />
            Performance Metrics
          </span>
        }
      >
        <div className="p-4 space-y-3 text-xs">
          <Metric label="Workflow Success Rate"
                  value={metrics.completed + metrics.failed === 0
                    ? "—"
                    : `${(metrics.successRate * 100).toFixed(0)}%`}
                  sub={`${metrics.completed} done / ${metrics.failed} failed`} />
          <Metric label="Avg Task Time"
                  value={metrics.avgDurationS == null
                    ? "—"
                    : `${metrics.avgDurationS.toFixed(1)}s`}
                  sub={`across ${metrics.completed} completed runs`} />
          <Metric label="Total Workflows"
                  value={String(metrics.total)} />
          <Metric label="Total Events"
                  value={String(metrics.totalEvents)}
                  sub="agent + tool + approval events" />
        </div>
      </Card>

      {Object.keys(usage).length > 0 && (
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <Layers className="size-3.5 text-accent" />
              Tool Usage by Agent
            </span>
          }
        >
          <div className="p-4 space-y-2">
            <ToolUsageBars usage={usage} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/40 pb-2 last:border-0">
      <div>
        <div className="text-muted">{label}</div>
        {sub && <div className="text-dim text-[10px] mt-0.5">{sub}</div>}
      </div>
      <div className="font-mono tabular-nums text-fg">{value}</div>
    </div>
  );
}

function ToolUsageBars({ usage }: { usage: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(usage));
  const sorted = Object.entries(usage).sort((a, b) => b[1] - a[1]) as [AgentName, number][];
  return (
    <ul className="space-y-1.5 text-[11px]">
      {sorted.map(([agent, count]) => (
        <li key={agent} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2">
          <span className="text-muted truncate">{agent}</span>
          <div className="h-1.5 bg-line rounded-full overflow-hidden">
            <div
              className={cn("h-full bg-accent")}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-fg w-8 text-right">{count}</span>
        </li>
      ))}
    </ul>
  );
}

