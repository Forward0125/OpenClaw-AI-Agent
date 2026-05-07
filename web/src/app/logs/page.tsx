"use client";

/**
 * Activity Logs page — matches screenshot 01_3.
 *
 * Two-column layout: chronological per-event timeline on the left,
 * Context & Insights rail on the right (Active Context, Pending
 * Approvals, Performance Metrics, Tool Usage by Agent).
 */

import { useMemo } from "react";
import { ActivityFeed } from "@/components/logs/ActivityFeed";
import { ContextRail } from "@/components/logs/ContextRail";
import { useWorkflows } from "@/hooks/useWorkflows";
import { buildFeed } from "@/lib/logs";

export default function Page() {
  const runs = useWorkflows();
  const feed = useMemo(() => buildFeed(runs, 200), [runs]);

  return (
    <div className="grid lg:grid-cols-[1fr_22rem] gap-6">
      <ActivityFeed entries={feed} />
      <ContextRail runs={runs} />
    </div>
  );
}
