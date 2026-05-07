/**
 * POST /api/run
 *
 * Body: { runId: string, query: string }
 *
 * Streams Server-Sent Events:
 *   event: workflow.event   data: WorkflowEventInput
 *   event: workflow.state   data: EngineState   (only if paused for approval)
 *   event: workflow.done    data: { finalAnswer }
 *   event: workflow.error   data: { error }
 *
 * Stateless: the client owns the workflow state. To resume after an
 * approval, the client posts the EngineState back to /api/run/resume
 * along with its decision.
 */

import { OpenAIClient } from "@/lib/openai-client";
import { initState, runUntilPause } from "@/lib/orchestrator";

export const runtime = "edge";

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { runId?: string; query?: string };
  try {
    body = (await req.json()) as { runId?: string; query?: string };
  } catch {
    return new Response(JSON.stringify({ error: "request body must be JSON" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (typeof body.runId !== "string" || typeof body.query !== "string") {
    return new Response(JSON.stringify({ error: "runId (string) and query (string) are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream  = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller closed (client disconnected) */ }
      };

      try {
        const client = new OpenAIClient(apiKey);
        const state  = initState(body.runId!, body.query!);
        const final  = await runUntilPause(state, {
          client,
          onEvent: (ev) => send("workflow.event", ev),
        });

        if (final.status === "awaiting_approval") {
          send("workflow.state", final);
        } else if (final.status === "completed") {
          send("workflow.done", { finalAnswer: final.finalAnswer });
        } else {
          send("workflow.error", { error: final.error ?? "unknown failure" });
        }
      } catch (err) {
        send("workflow.error", { error: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection":        "keep-alive",
    },
  });
}
