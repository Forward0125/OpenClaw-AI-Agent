# OpenClaw AI

AI executive assistant orchestrating 7 sub-agents across mock Slack/Calendar/GitHub/Email. Human-in-loop approval gates, streaming workflow DAG, browser-only.

> Production version connects via OAuth into your real services. This public demo uses pre-baked fixtures so anyone can try the orchestrator without an OAuth signup.

## Status

Step 2 of 12 &mdash; mock fixtures (calendar / Slack / GitHub / email / SMS) + cross-source keyword search.

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
