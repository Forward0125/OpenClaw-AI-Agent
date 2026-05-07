# OpenClaw AI

AI executive assistant orchestrating 7 sub-agents across mock Slack / Calendar / GitHub / Email / SMS. Human-in-loop approval gates, streaming workflow DAG, browser-only.

> Production version connects via OAuth into your real services. This public demo uses pre-baked fixtures so anyone can try the orchestrator without an OAuth signup.

## What's in it

| Page | What you can do |
|---|---|
| `/` Dashboard | KPI strip, 7-day trends chart, tool-usage donut, recent activity, alerts |
| `/workflows` | Run a new workflow with a typed query or 4 preset chips, browse past runs |
| `/workflows/[id]` | Live xyflow DAG visualization + real-time Execution Log + Final Answer card |
| `/approvals` | Queue of every workflow paused on a destructive tool, inline Approve / Decline |
| `/integrations` | The 5 fixture-backed sources with record counts and provider names |
| `/memory` | Keyword recall across all 5 sources + past workflow runs |
| `/logs` | Chronological Activity Log + Context & Insights right rail |
| `/settings` | Reset history + about panel |

## The 7 agents

| Agent | Tools |
|---|---|
| **Orchestrator** | router only &mdash; `delegate.{Specialist}` + `memory.recall` + `respond` |
| **Calendar** | `findSlots` (real conflict detection vs fixtures) + `createEvent` (needs approval) |
| **Slack** | `searchMessages` + `draftMessage` + `sendMessage` (needs approval) |
| **GitHub** | `listPRs` + `listIssues` + `summarizePR` &mdash; all read-only |
| **Email** | `searchInbox` + `draft` + `send` (needs approval) |
| **Memory** | `recall` over all 5 fixture sources + past workflow runs |
| **Approval** | synthetic &mdash; the engine fires `approval.required` events here for the UI |

Capability is enforced: a Slack agent that tries to call `email.send` is rejected at the engine before any approval gate fires.

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 |
| DAG visualizer | [`@xyflow/react`](https://reactflow.dev) |
| Orchestrator | Hand-rolled TypeScript state graph (LangGraph-inspired) |
| LLM | OpenAI gpt-4o-mini via a streaming SSE Vercel Edge route |
| Persistence | `localStorage` &mdash; workflow history, paused EngineState, fixtures |

**No backend, no Postgres, no auth.** Cold-start cost: zero. Free Vercel Hobby tier covers the whole thing.

## How a workflow runs

1. Client calls `startWorkflow(query)` &mdash; creates a local `WorkflowRun` record
2. Detail page mounts, opens an SSE connection to `POST /api/run`
3. The engine on the server runs `runUntilPause(state, options)`:
   - Calls `OpenAIClient.chat()` with the current agent's prompt + allowed tools
   - On `delegate.{X}` tool call &mdash; switches `currentAgent`, injects context
   - On `respond` &mdash; emits `workflow.complete`
   - On a destructive tool (`email.send`, `slack.sendMessage`, `calendar.createEvent`) &mdash; emits `approval.required` and **pauses**, returning the `EngineState` to the client
4. Client appends every event into the workflow store as it streams in
5. UI re-renders: DAG nodes light up, Execution Log scrolls, approval gate appears
6. User clicks Approve / Decline &mdash; client POSTs the saved EngineState to `/api/run/resume`
7. Engine resumes from exactly where it paused, more events stream in, eventually `workflow.complete`

State is fully serializable, so a paused workflow survives a hard refresh or a "come back tomorrow."

## Local dev

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Set `OPENAI_API_KEY` in `.env.local` (or the parent `.env`) for the orchestrator routes. Without it, `/api/run` returns 500.

## Smoke tests

```bash
cd web
npx tsx scripts/smoke-fixtures.ts       # 21 checks: counts, ISO parse, cross-source refs, search
npx tsx scripts/smoke-memory.ts          # 19 checks: workflow store mutations, recall
npx tsx scripts/smoke-tools.ts           # 25 checks: catalog structure + live handlers
npx tsx scripts/smoke-orchestrator.ts    # 17 checks: engine integration with scripted ModelClient
npx tsx scripts/smoke-logs.ts            # 14 checks: feed + metrics + tool usage
npx tsx scripts/smoke-analytics.ts       # 10 checks: trend bucketing + alert classification
```

Together: **106 unit + integration checks** across the data layer, store, tool catalog, orchestrator engine, and analytics. Run with no OpenAI key required &mdash; the engine smoke uses a scripted client.

## Vercel env vars

| Name | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Server-side only (not `NEXT_PUBLIC_*`). Used by `/api/run` + `/api/run/resume`. |

## Built with

Claude Code &mdash; 12-step rollout, ~30 components, ~3,500 lines of TypeScript.
