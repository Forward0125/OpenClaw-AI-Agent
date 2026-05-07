"use client";

import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";

interface Props {
  usage: Record<string, number>;
}

const COLORS = [
  "#06b6d4", // Calendar
  "#fb923c", // Slack
  "#a78bfa", // GitHub
  "#22c55e", // Email
  "#3b82f6", // Memory
  "#f59e0b", // Orchestrator
  "#ef4444", // any other
];

export function ToolDonut({ usage }: Props) {
  const entries = Object.entries(usage)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <Card title="Tool Usage Distribution">
      <div className="p-4">
        {total === 0 ? (
          <p className="text-sm text-muted py-8 text-center">
            No tool calls yet.
          </p>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
            <Donut entries={entries} total={total} />
            <ul className="space-y-1.5 text-xs">
              {entries.map(([agent, count], i) => (
                <li key={agent} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-fg truncate">{agent}</span>
                  <span className="text-muted font-mono tabular-nums">{count}</span>
                  <span className="text-dim font-mono tabular-nums w-10 text-right">
                    {((count / total) * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function Donut({
  entries,
  total,
}: {
  entries: [string, number][];
  total:   number;
}) {
  const radius      = 60;
  const innerRadius = 40;
  const circ        = 2 * Math.PI * radius;
  let offset = -Math.PI / 2; // start at 12 o'clock

  const slices = entries.map(([agent, count], i) => {
    const fraction = count / total;
    const arc = fraction * 2 * Math.PI;
    const x1 = Math.cos(offset) * radius;
    const y1 = Math.sin(offset) * radius;
    const x2 = Math.cos(offset + arc) * radius;
    const y2 = Math.sin(offset + arc) * radius;
    const ix1 = Math.cos(offset) * innerRadius;
    const iy1 = Math.sin(offset) * innerRadius;
    const ix2 = Math.cos(offset + arc) * innerRadius;
    const iy2 = Math.sin(offset + arc) * innerRadius;
    const largeArc = arc > Math.PI ? 1 : 0;
    const path = `
      M ${ix1} ${iy1}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix2} ${iy2}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
      Z
    `;
    offset += arc;
    return { path, color: COLORS[i % COLORS.length], agent, count };
  });

  return (
    <svg viewBox="-80 -80 160 160" width={160} height={160} className={cn("shrink-0")}>
      {slices.map((s) => (
        <path key={s.agent} d={s.path} fill={s.color} stroke="#0a0e14" strokeWidth={1} />
      ))}
      <text x={0} y={-2} textAnchor="middle" className="fill-fg" style={{ fontSize: 18, fontFamily: "monospace" }}>
        {total}
      </text>
      <text x={0} y={14} textAnchor="middle" className="fill-muted" style={{ fontSize: 9 }}>
        TOOL CALLS
      </text>
    </svg>
  );
}
