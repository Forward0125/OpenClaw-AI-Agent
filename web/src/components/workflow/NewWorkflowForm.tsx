"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Sparkles } from "lucide-react";
import { Card } from "@/components/Card";
import { startWorkflow } from "@/lib/workflow-store";
import { cn } from "@/lib/cn";

const PRESETS: { label: string; query: string }[] = [
  { label: "Schedule team sync next week",     query: "Schedule a 30-min team sync next week with Sarah, Mike, and Estedam." },
  { label: "Summarize PR #142",                query: "Summarize PR #142 and tell me if it's blocking the launch." },
  { label: "Draft a status update",            query: "Draft a Slack message to #product summarizing this week's launch progress." },
  { label: "What needs my attention today?",   query: "What needs my attention today across email, Slack, GitHub, and calendar?" },
];

export function NewWorkflowForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function submit(query: string): void {
    if (submitting) return;
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    setSubmitting(true);
    const run = startWorkflow(trimmed);
    router.push(`/workflows/${run.id}`);
  }

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent" />
          New Workflow
        </span>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); submit(text); }}
        className="p-4 space-y-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Ask the agent anything — e.g. 'when am I free for a 30-min meeting with Sarah next week?'"
          className="w-full bg-page border border-line rounded px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => submit(p.query)}
              disabled={submitting}
              className="text-[11px] px-2.5 py-1 rounded border border-line bg-elevated hover:border-accent/50 hover:text-fg text-muted transition-colors disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || text.trim().length === 0}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2",
              "bg-accent text-page hover:bg-accent/85 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Play className="size-3.5" />
            Run workflow
          </button>
        </div>
      </form>
    </Card>
  );
}
