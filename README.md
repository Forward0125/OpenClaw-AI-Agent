# OpenClaw AI

AI executive assistant orchestrating 7 sub-agents across mock Slack/Calendar/GitHub/Email. Human-in-loop approval gates, streaming workflow DAG, browser-only.

> Production version connects via OAuth into your real services. This public demo uses pre-baked fixtures so anyone can try the orchestrator without an OAuth signup.

## Status

Step 7 of 12 &mdash; SSE API routes (`POST /api/run` + `POST /api/run/resume`) wired to a real OpenAI ModelClient. End-to-end multi-agent workflows verified live.

> **Vercel env var required:** `OPENAI_API_KEY` (server-only, not `NEXT_PUBLIC_*`).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 |
| DAG visualizer | [`@xyflow/react`](https://reactflow.dev) |
| Orchestrator | Hand-rolled TypeScript state graph (LangGraph-inspired) |
| LLM | OpenAI gpt-4o-mini via Vercel API route, streaming SSE |
| Persistence | localStorage (workflow history, approvals, memory) |

No backend, no Postgres, no auth. Runs on Vercel Hobby.

## Local dev

```bash
cd web
npm install
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` for the orchestrator routes (lands in step 7).
