"use client";

import { Card } from "@/components/Card";
import type { DailyBucket } from "@/lib/analytics";
import { cn } from "@/lib/cn";

interface Props { buckets: DailyBucket[] }

export function TrendsChart({ buckets }: Props) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <Card title="Workflow Execution Trends (Last 7 Days)">
      <div className="p-4 space-y-3">
        {total === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            No workflows in the last 7 days. Start one from the sidebar.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 items-end" style={{ height: 160 }}>
              {buckets.map((b) => <Bar key={b.day} bucket={b} max={max} />)}
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-muted">
              <Legend color="bg-ok"   label="Completed" />
              <Legend color="bg-warn" label="Awaiting" />
              <Legend color="bg-err"  label="Failed" />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Bar({ bucket, max }: { bucket: DailyBucket; max: number }) {
  const heightPct = (bucket.total / max) * 100;
  const completedPct = bucket.total > 0 ? (bucket.completed / bucket.total) * 100 : 0;
  const awaitingPct  = bucket.total > 0 ? (bucket.awaiting  / bucket.total) * 100 : 0;
  const failedPct    = bucket.total > 0 ? (bucket.failed    / bucket.total) * 100 : 0;
  const dayLabel = formatDay(bucket.day);

  return (
    <div className="flex flex-col items-center gap-1.5 h-full">
      <div
        className="w-full bg-elevated rounded-sm overflow-hidden flex flex-col justify-end relative"
        style={{ height: `${Math.max(2, heightPct)}%`, minHeight: "4px" }}
        title={`${bucket.day}: ${bucket.total} runs (${bucket.completed}✓ ${bucket.awaiting}⏳ ${bucket.failed}✗)`}
      >
        {bucket.total > 0 && (
          <>
            <div className={cn("bg-err")}  style={{ height: `${failedPct}%` }} />
            <div className={cn("bg-warn")} style={{ height: `${awaitingPct}%` }} />
            <div className={cn("bg-ok")}   style={{ height: `${completedPct}%` }} />
          </>
        )}
      </div>
      <div className="text-[10px] text-dim font-mono tabular-nums leading-none">{dayLabel}</div>
      <div className="text-[10px] text-fg font-mono tabular-nums leading-none">{bucket.total}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", color)} />
      <span>{label}</span>
    </span>
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return dow;
}
