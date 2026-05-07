"use client";

import { useSyncExternalStore } from "react";
import {
  loadWorkflows,
  subscribeWorkflows,
  type WorkflowRun,
} from "@/lib/workflow-store";

const SSR_FALLBACK: WorkflowRun[] = [];

/** Read-only subscription to the workflow history store. */
export function useWorkflows(): WorkflowRun[] {
  return useSyncExternalStore(
    subscribeWorkflows,
    loadWorkflows,
    () => SSR_FALLBACK,
  );
}
