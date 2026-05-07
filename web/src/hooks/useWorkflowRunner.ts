"use client";

/**
 * SSE consumer for /api/run + /api/run/resume. Opens the stream once
 * per (runId, query) — events are appended to the workflow store as
 * they arrive, which triggers re-renders via useWorkflows().
 *
 * Auto-opens the run when called from a fresh detail page; the caller
 * sets `enabled = true` only when there's a query that hasn't been
 * processed yet.
 */

import { useEffect, useRef, useState } from "react";
import {
  appendEvent,
  clearPausedState,
  completeWorkflow,
  failWorkflow,
  setPausedState,
  type WorkflowEventInput,
} from "@/lib/workflow-store";

export interface UseWorkflowRunnerOptions {
  runId:    string;
  query:    string;
  enabled?: boolean;
}

export interface UseWorkflowRunnerResult {
  status:  "idle" | "streaming" | "done" | "error";
  error:   string | null;
}

export function useWorkflowRunner({
  runId,
  query,
  enabled = true,
}: UseWorkflowRunnerOptions): UseWorkflowRunnerResult {
  const [status, setStatus] = useState<UseWorkflowRunnerResult["status"]>("idle");
  const [error,  setError]  = useState<string | null>(null);
  const startedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (startedRef.current.has(runId)) return;
    startedRef.current.add(runId);

    const controller = new AbortController();
    setStatus("streaming");
    setError(null);

    void runStream(runId, query, controller.signal, setStatus, setError);

    return () => controller.abort();
  }, [runId, query, enabled]);

  return { status, error };
}

async function runStream(
  runId:    string,
  query:    string,
  signal:   AbortSignal,
  setStatus: (s: UseWorkflowRunnerResult["status"]) => void,
  setError:  (e: string | null) => void,
): Promise<void> {
  try {
    const res = await fetch("/api/run", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ runId, query }),
      signal,
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`/api/run ${res.status}: ${text.slice(0, 200)}`);
    }
    await consumeSSE(runId, res.body, signal);
    setStatus("done");
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    const message = err instanceof Error ? err.message : String(err);
    setStatus("error");
    setError(message);
    failWorkflow(runId, message);
  }
}

/** Resume a paused run with the user's decision. Called by the
 *  approval-card UI in step 9; lives here so the SSE plumbing stays
 *  in one place. */
export async function resumePausedRun(
  runId:     string,
  state:     unknown,
  decision:  "approve" | "decline",
): Promise<void> {
  clearPausedState(runId);
  const res = await fetch("/api/run/resume", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ state, decision }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`/api/run/resume ${res.status}: ${text.slice(0, 200)}`);
  }
  await consumeSSE(runId, res.body, new AbortController().signal);
}

async function consumeSSE(
  runId:  string,
  body:   ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<void> {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const raw of frames) {
        if (!raw.trim()) continue;
        let event = "";
        let data  = "";
        for (const line of raw.split("\n")) {
          if (line.startsWith("event: ")) event = line.slice(7).trim();
          else if (line.startsWith("data: ")) data += line.slice(6);
        }
        if (!event) continue;
        try {
          const parsed = data ? JSON.parse(data) : null;
          handleEvent(runId, event, parsed);
        } catch {
          // malformed frame — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleEvent(runId: string, event: string, data: unknown): void {
  switch (event) {
    case "workflow.event":
      if (data && typeof data === "object") {
        appendEvent(runId, data as WorkflowEventInput);
      }
      return;
    case "workflow.state":
      // Server paused for approval; persist the EngineState so the
      // approval-card UI can resume.
      setPausedState(runId, data);
      return;
    case "workflow.done":
      if (data && typeof (data as { finalAnswer?: string }).finalAnswer === "string") {
        completeWorkflow(runId, (data as { finalAnswer: string }).finalAnswer);
      }
      return;
    case "workflow.error":
      if (data && typeof (data as { error?: string }).error === "string") {
        failWorkflow(runId, (data as { error: string }).error);
      }
      return;
  }
}
