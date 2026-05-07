"use client";

import { Bell, ChevronDown, Pause, Play } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

const TITLES: Record<string, string> = {
  "/":             "Agent Dashboard",
  "/workflows":    "Agent Workflow Center",
  "/approvals":    "Pending Approvals",
  "/integrations": "Integrations",
  "/memory":       "Long-term Memory",
  "/logs":         "Activity Logs",
  "/settings":     "Settings",
};

export function TopBar() {
  const pathname  = usePathname();
  const [paused, setPaused] = useState(false);
  const title = TITLES[pathname] ?? "OpenClaw AI";

  return (
    <header className="h-14 px-6 border-b border-line flex items-center justify-between bg-page">
      <h1 className="text-base font-medium tracking-tight">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
            paused
              ? "border-warn/30 bg-warn/10 text-warn hover:bg-warn/15"
              : "border-ok/30 bg-ok/10 text-ok hover:bg-ok/15",
          )}
        >
          {paused
            ? <><Play className="size-3" /> Resume Agent</>
            : <><Pause className="size-3" /> Pause Agent</>}
        </button>

        <button
          type="button"
          className="relative p-1.5 rounded-md hover:bg-card transition-colors text-muted hover:text-fg"
          title="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent ring-2 ring-page" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-card transition-colors"
        >
          <div className="size-7 rounded-full bg-elevated ring-1 ring-line flex items-center justify-center text-xs font-medium">
            RP
          </div>
          <ChevronDown className="size-3.5 text-muted" />
        </button>
      </div>
    </header>
  );
}
