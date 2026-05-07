/**
 * Unified memory recall — keyword search across both fixtures (the
 * "live" Slack/Calendar/GitHub/Email/SMS state) and the workflow
 * history (every past agent run with its events + final answer).
 *
 * In production we'd swap the keyword match for embeddings + a
 * vector store. The shape of MemoryHit stays the same either way
 * so the Memory agent (step 6) doesn't care.
 */

import { searchFixtures, type FixtureKind, type SearchHit } from "./fixtures";
import { loadWorkflows, type WorkflowRun } from "./workflow-store";

export type MemorySource = FixtureKind | "workflow";

export interface MemoryHit {
  source:  MemorySource;
  id:      string;
  title:   string;
  snippet: string;
  date:    string;       // ISO
  /** Original record — typed loosely because consumers usually only
   *  need the rendered fields above. The Memory agent passes this
   *  back as "evidence" for the orchestrator. */
  ref:     SearchHit["source"] | WorkflowRun;
}

export function recallMemory(query: string, limit = 20): MemoryHit[] {
  const fixtureHits  = searchFixtures(query, limit);
  const workflowHits = searchWorkflows(query, limit);

  const merged: MemoryHit[] = [
    ...fixtureHits.map<MemoryHit>((h) => ({
      source: h.kind, id: h.id, title: h.title, snippet: h.snippet, date: h.date, ref: h.source,
    })),
    ...workflowHits,
  ];

  merged.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return merged.slice(0, limit);
}

export function searchWorkflows(query: string, limit = 20): MemoryHit[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const out: MemoryHit[] = [];
  for (const run of loadWorkflows()) {
    if (matches(q, run.query, run.finalAnswer, ...run.agentsUsed)) {
      out.push({
        source:  "workflow",
        id:      run.id,
        title:   `Workflow: ${run.query}`,
        snippet: run.finalAnswer ?? `Status: ${run.status}`,
        date:    run.finishedAt ?? run.startedAt,
        ref:     run,
      });
      continue;
    }
    // Also match against any tool result snippets / agent messages.
    const eventMatch = run.events.find((ev) => {
      if (ev.type === "agent.message" && ev.text.toLowerCase().includes(q)) return true;
      if (ev.type === "tool.result"   && JSON.stringify(ev.result).toLowerCase().includes(q)) return true;
      return false;
    });
    if (eventMatch) {
      const snippet =
        eventMatch.type === "agent.message"
          ? eventMatch.text
          : JSON.stringify((eventMatch as { result: unknown }).result).slice(0, 200);
      out.push({
        source:  "workflow",
        id:      run.id,
        title:   `Workflow: ${run.query}`,
        snippet,
        date:    eventMatch.ts,
        ref:     run,
      });
    }
  }

  out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return out.slice(0, limit);
}

function matches(q: string, ...fields: (string | undefined)[]): boolean {
  for (const f of fields) {
    if (f && f.toLowerCase().includes(q)) return true;
  }
  return false;
}
