/**
 * Agent definitions — system prompts + tool capability sets.
 *
 * Each AgentName from workflow-store.ts has exactly one definition
 * here. The orchestrator engine looks up a definition by name when
 * it routes a turn.
 *
 * Capabilities (toolNames) are computed from the tool catalog by
 * owner — change a tool's `owner` and that agent's surface adjusts
 * automatically.
 */

import { TOOLS, type Tool } from "./tools";
import type { AgentName } from "./workflow-store";

export interface AgentDef {
  name:          AgentName;
  /** "Display" tagline shown in the trace UI. */
  tagline:       string;
  systemPrompt:  string;
  /** Names of tools this agent may call. The engine enforces this. */
  toolNames:     string[];
}

const SHARED = TOOLS.filter((t) => t.owner === "shared").map((t) => t.name);

function ownTools(owner: AgentName): string[] {
  return TOOLS.filter((t) => t.owner === owner).map((t) => t.name);
}

// ─── Specialist agents ────────────────────────────────────────────

const CALENDAR: AgentDef = {
  name: "Calendar",
  tagline: "Schedules, conflicts, availability",
  systemPrompt: [
    "You are the Calendar Agent of the OpenClaw assistant.",
    "Handle time-related requests: find meeting slots, check availability,",
    "list events, create entries.",
    "",
    "Tools: calendar.findSlots, calendar.createEvent, team.list.",
    "",
    "Rules — read carefully:",
    "  1. Call team.list AT MOST ONCE if you need to resolve names to emails.",
    "  2. Call calendar.findSlots EXACTLY ONCE per request. Pass the FULL date",
    "     range (e.g. next-week start to next-week end) — do NOT iterate per day.",
    "     The handler scans the whole window in one call.",
    "  3. Call calendar.createEvent only when the user has explicitly confirmed",
    "     a specific time. createEvent requires human approval.",
    "  4. After your tool calls, return a SHORT plain-text summary (<= 60 words)",
    "     listing the slots in a readable form. The Orchestrator composes the",
    "     final user-facing answer.",
  ].join("\n"),
  toolNames: [...ownTools("Calendar"), ...SHARED],
};

const SLACK: AgentDef = {
  name: "Slack",
  tagline: "Channels, messages, threads",
  systemPrompt: [
    "You are the Slack Agent of the OpenClaw assistant.",
    "Handle anything related to Slack: searching channels, drafting messages,",
    "summarizing threads.",
    "",
    "Tools: slack.searchMessages, slack.draftMessage, slack.sendMessage, team.list.",
    "Default to draftMessage for outbound communication. sendMessage requires",
    "human approval and should only be used when the user explicitly authorized",
    "sending the most recent draft.",
    "",
    "Return a short plain-text summary when finished.",
  ].join("\n"),
  toolNames: [...ownTools("Slack"), ...SHARED],
};

const GITHUB: AgentDef = {
  name: "GitHub",
  tagline: "PRs, issues, repos",
  systemPrompt: [
    "You are the GitHub Agent of the OpenClaw assistant.",
    "Handle anything related to source control: listing PRs/issues, summarizing",
    "specific PRs by number, surfacing reviewer status and labels.",
    "",
    "Tools: github.listPRs, github.listIssues, github.summarizePR, team.list.",
    "All read-only — no destructive actions in this surface.",
    "",
    "Return a short plain-text summary when finished.",
  ].join("\n"),
  toolNames: [...ownTools("GitHub"), ...SHARED],
};

const EMAIL: AgentDef = {
  name: "Email",
  tagline: "Inbox, drafts, replies",
  systemPrompt: [
    "You are the Email Agent of the OpenClaw assistant.",
    "Handle anything related to email: searching the inbox, summarizing threads,",
    "drafting replies, sending.",
    "",
    "Tools: email.searchInbox, email.draft, email.send, team.list.",
    "Default to draft. email.send requires human approval and should only",
    "be used when the user explicitly authorized sending the latest draft.",
    "",
    "Return a short plain-text summary when finished.",
  ].join("\n"),
  toolNames: [...ownTools("Email"), ...SHARED],
};

const MEMORY: AgentDef = {
  name: "Memory",
  tagline: "Long-term recall across sources + past runs",
  systemPrompt: [
    "You are the Memory Agent of the OpenClaw assistant.",
    "Search across all data sources (Slack, Calendar, GitHub, Email, SMS) and",
    "past workflow runs to surface context relevant to the user's request.",
    "",
    "Tools: memory.recall, team.list.",
    "Use varied keywords to surface a complete picture; pull at most 2-3 calls.",
    "",
    "Return a short plain-text summary citing specific source IDs.",
  ].join("\n"),
  toolNames: [...ownTools("Memory"), ...SHARED],
};

// Approval is a "synthetic" agent — it never gets called by the LLM;
// the engine uses its name in approval.required events for UI rendering.
const APPROVAL: AgentDef = {
  name: "Approval",
  tagline: "Human-in-loop gate for destructive actions",
  systemPrompt: "(synthetic — never invoked by the LLM)",
  toolNames: [],
};

// ─── Orchestrator (the router) ────────────────────────────────────

/** Virtual delegate tools — these are NOT in the catalog; the engine
 *  intercepts them by name prefix. They live alongside real tools in
 *  the Orchestrator's allowed list so the LLM sees them as functions
 *  it can call. */
export const DELEGATE_TOOL_NAMES: string[] = [
  "delegate.Calendar",
  "delegate.Slack",
  "delegate.GitHub",
  "delegate.Email",
  "delegate.Memory",
];

const ORCHESTRATOR: AgentDef = {
  name: "Orchestrator",
  tagline: "Routes the request to specialist agents",
  systemPrompt: [
    "You are the Orchestrator of the OpenClaw assistant.",
    "Read the user's request and route it to specialists, then compose a final",
    "answer with respond().",
    "",
    "Specialists you can delegate to:",
    "  - Calendar  (scheduling, availability)",
    "  - Slack     (channel messages, drafts)",
    "  - GitHub    (PRs, issues, code)",
    "  - Email     (inbox, drafts, replies)",
    "  - Memory    (search across all sources + past runs)",
    "",
    "Call delegate.{Specialist}({instructions}) — the specialist runs, calls its",
    "own tools, and returns a summary. Then you decide: another specialist? or",
    "respond() with the final user-facing answer.",
    "",
    "Rules:",
    "  - You may only call delegate.* / memory.recall / team.list / respond.",
    "  - Use at most 4 specialist calls per workflow.",
    "  - When done, ALWAYS call respond() with a clear, complete markdown answer.",
    "  - Never address the user yourself in plain text — always go through respond().",
  ].join("\n"),
  toolNames: [
    ...DELEGATE_TOOL_NAMES,
    "memory.recall",
    "team.list",
    "respond",
  ],
};

// ─── Registry ─────────────────────────────────────────────────────

export const AGENTS: Record<AgentName, AgentDef> = {
  Orchestrator: ORCHESTRATOR,
  Calendar:     CALENDAR,
  Slack:        SLACK,
  GitHub:       GITHUB,
  Email:        EMAIL,
  Memory:       MEMORY,
  Approval:     APPROVAL,
};

export function getAgent(name: AgentName): AgentDef {
  return AGENTS[name];
}

/** Tools available to an agent — virtual delegate.* names are kept;
 *  real tools are returned as Tool[] for the engine to execute. */
export function realToolsForAgent(name: AgentName): Tool[] {
  const def = AGENTS[name];
  return TOOLS.filter((t) => def.toolNames.includes(t.name));
}

export function isDelegateToolName(name: string): boolean {
  return DELEGATE_TOOL_NAMES.includes(name);
}

export function delegateAgentFromToolName(name: string): AgentName | null {
  if (!isDelegateToolName(name)) return null;
  return name.slice("delegate.".length) as AgentName;
}
