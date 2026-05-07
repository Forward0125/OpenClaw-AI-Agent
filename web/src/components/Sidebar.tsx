"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Brain,
  CheckCircle2,
  Feather,
  LayoutDashboard,
  Plug,
  Settings,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/workflows",    label: "Workflows",   icon: Workflow },
  { href: "/approvals",    label: "Approvals",   icon: CheckCircle2 },
  { href: "/integrations", label: "Integrations",icon: Plug },
  { href: "/memory",       label: "Memory",      icon: Brain },
  { href: "/logs",         label: "Logs",        icon: Activity },
  { href: "/settings",     label: "Settings",    icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-panel border-r border-line flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-line">
        <div className="size-9 rounded-lg bg-accent/15 flex items-center justify-center ring-1 ring-accent/30">
          <ClawLogo />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">OpenClaw <span className="text-accent">AI</span></div>
          <div className="text-[10px] tracking-widest text-muted uppercase">Personal Agent</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-card text-fg ring-1 ring-line"
                  : "text-muted hover:bg-card/60 hover:text-fg",
              )}
            >
              <Icon className={cn("size-4", active ? "text-accent" : "text-muted")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-line">
        <div className="rounded-md bg-elevated px-3 py-2 flex items-center gap-2 text-[11px]">
          <span className="size-2 rounded-full bg-ok animate-pulse shrink-0" />
          <span className="text-muted">Agent</span>
          <span className="text-ok font-medium ml-auto">ACTIVE</span>
        </div>
        <div className="mt-2 text-[10px] text-dim leading-snug px-1">
          v0.1 &middot; demo &middot; mock fixtures
        </div>
      </div>
    </aside>
  );
}

function ClawLogo() {
  // Feather as the OpenClaw brand mark — recognizable, inline lucide.
  return <Feather className="size-4 text-accent" aria-hidden />;
}
