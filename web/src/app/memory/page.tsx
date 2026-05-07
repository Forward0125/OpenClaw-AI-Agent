"use client";

/**
 * Memory page — keyword search across all fixtures + past workflow
 * runs. Same recallMemory() the Memory agent calls under the hood,
 * exposed here as a debugging / browsing surface.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Calendar as CalIcon,
  GitPullRequest,
  Hash,
  Mail,
  MessageSquare,
  Search,
  Workflow,
} from "lucide-react";
import { Card } from "@/components/Card";
import { recallMemory, type MemoryHit, type MemorySource } from "@/lib/memory";
import { useWorkflows } from "@/hooks/useWorkflows";
import { cn } from "@/lib/cn";

export default function Page() {
  const [query, setQuery] = useState("alpha");
  // Re-render when workflow history changes so search results stay live.
  useWorkflows();
  const hits = useMemo(() => recallMemory(query, 30), [query]);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <Brain className="size-3.5 text-accent" />
            Long-term Memory
          </span>
        }
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted">
            Keyword recall across every Slack message, calendar event, GitHub PR,
            email, SMS, and past workflow run. Production would back this with
            embeddings + a vector store; the agent surface is the same either way.
          </p>

          <label className="block">
            <span className="sr-only">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across Slack, Calendar, GitHub, Email, SMS, past runs…"
                className="w-full bg-page border border-line rounded pl-10 pr-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuery(q)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded border transition-colors",
                  q === query
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-line bg-elevated text-muted hover:text-fg",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title={`Results (${hits.length})`}>
        {hits.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No matches across any source. Try a different keyword.
          </p>
        ) : (
          <ul className="divide-y divide-line/40">
            {hits.map((h) => <Hit key={`${h.source}:${h.id}`} hit={h} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}

const EXAMPLES = ["alpha", "Sarah", "PR #142", "SSO", "Acme", "rollback"];

function Hit({ hit }: { hit: MemoryHit }) {
  const tone = TONE[hit.source];
  const Icon = tone.icon;
  return (
    <li className="px-4 py-3 hover:bg-elevated/40 transition-colors">
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex items-center justify-center size-7 rounded shrink-0", tone.bg)}>
          <Icon className={cn("size-3.5", tone.fg)} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("text-[10px] uppercase tracking-wider font-bold", tone.fg)}>
              {hit.source}
            </span>
            <span className="text-xs text-fg font-medium truncate">{hit.title}</span>
            <span className="text-[11px] text-dim font-mono tabular-nums ml-auto shrink-0">
              {fmtDate(hit.date)}
            </span>
          </div>
          <p className="text-xs text-muted mt-1 line-clamp-2 leading-snug break-words">{hit.snippet}</p>
          {hit.source === "workflow" && (
            <Link
              href={`/workflows/${hit.id}`}
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

const TONE: Record<MemorySource, { icon: React.ComponentType<{ className?: string }>; bg: string; fg: string }> = {
  calendar: { icon: CalIcon,        bg: "bg-info/15",   fg: "text-info" },
  slack:    { icon: Hash,            bg: "bg-warn/15",   fg: "text-warn" },
  github:   { icon: GitPullRequest,  bg: "bg-accent/15", fg: "text-accent" },
  email:    { icon: Mail,            bg: "bg-ok/15",     fg: "text-ok" },
  sms:      { icon: MessageSquare,   bg: "bg-elevated",  fg: "text-muted" },
  workflow: { icon: Workflow,        bg: "bg-accent/15", fg: "text-accent" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
