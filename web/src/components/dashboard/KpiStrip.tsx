"use client";

import { Activity, Database, Layers, Zap } from "lucide-react";
import { Card } from "@/components/Card";
import type { PerformanceMetrics } from "@/lib/analytics";
import { cn } from "@/lib/cn";

interface Props {
  metrics: PerformanceMetrics;
}

const INTEGRATIONS = ["Slack", "Calendar", "GitHub", "Email", "SMS"];

export function KpiStrip({ metrics }: Props) {
  const ratePct =
    metrics.completed + metrics.failed === 0
      ? null
      : Math.round(metrics.successRate * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi
        icon={<Zap className="size-4" />}
        label="Task Completion Rate"
        primary={ratePct == null ? "—" : `${ratePct}%`}
        secondary={`${metrics.completed} done · ${metrics.failed} failed`}
        tone={ratePct == null ? undefined : ratePct >= 80 ? "up" : ratePct < 50 ? "down" : undefined}
      />
      <Kpi
        icon={<Activity className="size-4" />}
        label="Avg Response Time"
        primary={metrics.avgDurationS == null ? "—" : `${metrics.avgDurationS.toFixed(1)}s`}
        secondary={
          metrics.avgDurationS == null
            ? "no completed runs yet"
            : `across ${metrics.completed} completed runs`
        }
      />
      <Kpi
        icon={<Layers className="size-4" />}
        label="Integrations Active"
        primary={`${INTEGRATIONS.length}/${INTEGRATIONS.length}`}
        secondary={INTEGRATIONS.join(" · ")}
        tone="up"
      />
      <Kpi
        icon={<Database className="size-4" />}
        label="Workflows Tracked"
        primary={String(metrics.total)}
        secondary={`${metrics.totalEvents} events recorded`}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  primary,
  secondary,
  tone,
}: {
  icon:       React.ReactNode;
  label:      string;
  primary:    string;
  secondary:  string;
  tone?:      "up" | "down";
}) {
  return (
    <Card>
      <div className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span className="text-accent">{icon}</span>
          {label}
        </div>
        <div
          className={cn(
            "text-xl font-semibold font-mono tabular-nums",
            tone === "up"   && "text-ok",
            tone === "down" && "text-err",
            !tone           && "text-fg",
          )}
        >
          {primary}
        </div>
        <div className="text-[11px] text-dim line-clamp-1">{secondary}</div>
      </div>
    </Card>
  );
}
