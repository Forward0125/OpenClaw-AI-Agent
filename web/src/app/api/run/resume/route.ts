/**
 * POST /api/run/resume
 *
 * Body: { state: EngineState (paused), decision: "approve" | "decline" }
 *
 * Streams the same SSE event types as /api/run. After the engine
 * resumes from the approval gate it may pause again on a SECOND
 * destructive action — clients should treat workflow.state on
 * resume as identical to the initial-call response.
 */

import { OpenAIClient } from "@/lib/openai-client";
import {
  resumeAfterApproval,
  type EngineState,
} from "@/lib/orchestrator";

export const runtime = "edge";

interface ResumeBody {
  state:    EngineState;
  decision: "approve" | "decline";
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured on the server" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  let body: ResumeBody;
  try {
    body = (await req.json()) as ResumeBody;
  } catch {
    return new Response(JSON.stringify({ error: "request body must be JSON" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.state || (body.decision !== "approve" && body.decision !== "decline")) {
    return new Response(JSON.stringify({ error: "state and decision (approve|decline) are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (body.state.status !== "awaiting_approval") {
    return new Response(JSON.stringify({ error: `state.status must be 'awaiting_approval', got '${body.state.status}'` }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream  = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* client gone */ }
      };

      try {
        const client = new OpenAIClient(apiKey);
        const final  = await resumeAfterApproval(body.state, body.decision, {
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
