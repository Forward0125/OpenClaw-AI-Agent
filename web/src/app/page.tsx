"use client";

/**
 * Agent Dashboard — analytics overview matching screenshot 01_2.
 *
 * Layout:
 *   - 4 KPI tiles (full width)
 *   - 2-col: Trends chart (wide) + Tool donut
 *   - 2-col: Recent Activity (wide) + Alerts
 */

import { useMemo } from "react";
import { AlertsPanel }   from "@/components/dashboard/AlertsPanel";
import { KpiStrip }       from "@/components/dashboard/KpiStrip";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ToolDonut }      from "@/components/dashboard/ToolDonut";
import { TrendsChart }    from "@/components/dashboard/TrendsChart";
import { useWorkflows } from "@/hooks/useWorkflows";
import {
  buildAlerts,
  buildTrend,
  computeMetrics,
} from "@/lib/analytics";
import { computeToolUsage } from "@/lib/logs";

export default function Page() {
  const runs = useWorkflows();

  const metrics  = useMemo(() => computeMetrics(runs),       [runs]);
  const trend    = useMemo(() => buildTrend(runs, 7),         [runs]);
  const usage    = useMemo(() => computeToolUsage(runs),       [runs]);
  const alerts   = useMemo(() => buildAlerts(runs),            [runs]);

  return (
    <div className="space-y-6">
      <KpiStrip metrics={metrics} />

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <TrendsChart buckets={trend} />
        <ToolDonut usage={usage} />
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <RecentActivity runs={runs} />
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  );
}
