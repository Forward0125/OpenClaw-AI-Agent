"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Bell, Info } from "lucide-react";
import { Card } from "@/components/Card";
import type { Alert } from "@/lib/analytics";
import { cn } from "@/lib/cn";

interface Props { alerts: Alert[] }

export function AlertsPanel({ alerts }: Props) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Bell className="size-3.5 text-accent" />
          Alerts &amp; Requires Attention
        </span>
      }
    >
      {alerts.length === 0 ? (
        <div className="p-6 text-sm text-muted text-center">
          <p>All clear.</p>
          <p className="text-[11px] text-dim mt-1">No failed runs or pending approvals.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line/40">
          {alerts.map((a) => <Row key={a.id} alert={a} />)}
        </ul>
      )}
    </Card>
  );
}

function Row({ alert }: { alert: Alert }) {
  const tone = TONES[alert.severity];
  const Icon = tone.Icon;
  return (
    <li className={cn("p-3 border-l-2", tone.border)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("size-3.5 shrink-0 mt-0.5", tone.fg)} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-fg leading-snug font-medium truncate">{alert.title}</div>
          {alert.body && (
            <div className="text-[11px] text-muted mt-0.5 line-clamp-2 leading-snug break-words">
              {alert.body}
            </div>
          )}
          {alert.runId && (
            <Link
              href={`/workflows/${alert.runId}`}
              className="mt-1 text-[11px] text-accent hover:underline inline-flex items-center gap-1"
            >
              Open workflow <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

const TONES = {
  error:   { Icon: AlertCircle,    border: "border-l-err",  fg: "text-err" },
  warning: { Icon: AlertTriangle,  border: "border-l-warn", fg: "text-warn" },
  info:    { Icon: Info,           border: "border-l-info", fg: "text-info" },
};
