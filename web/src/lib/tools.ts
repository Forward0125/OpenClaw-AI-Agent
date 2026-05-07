/**
 * Tool catalog — every function the agents can call.
 *
 * Each Tool is:
 *   - typed in TypeScript at the seam (handler args + result)
 *   - typed for the LLM via JSON Schema in `parameters` (the
 *     OpenAI function-calling subset)
 *   - tagged with a riskLevel so the orchestrator (step 5) can
 *     pause for human approval before destructive actions run
 *
 * Conceptually the same as LangGraph's "tools" or LangChain's
 * function calling — handcrafted in TS so we get strict types and
 * don't ship the LangChain runtime.
 */

import {
  CALENDAR_EVENTS,
  EMAILS,
  GITHUB_ITEMS,
  SLACK_MESSAGES,
  SMS_MESSAGES,
  TEAM,
  type CalendarEvent,
  type EmailMessage,
  type GithubItem,
  type SlackMessage,
} from "./fixtures";
import { recallMemory, type MemoryHit } from "./memory";
import type { AgentName } from "./workflow-store";

// ─── Tool surface ─────────────────────────────────────────────────

export type RiskLevel = "safe" | "destructive" | "terminal";

/** OpenAI's function-calling JSON-schema subset. */
type FieldType =
  | { type: "string";  description?: string; enum?: readonly string[] }
  | { type: "number";  description?: string }
  | { type: "integer"; description?: string }
  | { type: "boolean"; description?: string }
  | { type: "array";   description?: string; items: FieldType };

export interface ToolSchema {
  type:                 "object";
  additionalProperties: false;
  properties:           Record<string, FieldType>;
  required:             string[];
}

export interface Tool<A = unknown, R = unknown> {
  name:        string;       // e.g. "calendar.findSlots"
  owner:       AgentName | "shared";
  description: string;
  parameters:  ToolSchema;
  riskLevel:   RiskLevel;
  handler:     (args: A) => Promise<R> | R;
}

// ─── Calendar tools ───────────────────────────────────────────────

interface FindSlotsArgs {
  startDate:    string;
  endDate:      string;
  durationMin:  number;
  attendees?:   string[];
}

interface SlotResult {
  start: string;
  end:   string;
}

const calendarFindSlots: Tool<FindSlotsArgs, { slots: SlotResult[]; checked: number }> = {
  name:        "calendar.findSlots",
  owner:       "Calendar",
  description:
    "Find available 30-min-or-longer slots in working hours (9-5 weekdays) between two dates. " +
    "Pass attendee emails to restrict to slots free for ALL of them.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["startDate", "endDate", "durationMin"],
    properties: {
      startDate:   { type: "string",  description: "ISO 8601 start of search window." },
      endDate:     { type: "string",  description: "ISO 8601 end of search window." },
      durationMin: { type: "integer", description: "Required slot length in minutes." },
      attendees:   { type: "array",   items: { type: "string" }, description: "Attendee emails." },
    },
  },
  handler: ({ startDate, endDate, durationMin, attendees = [] }) => {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const slots: SlotResult[] = [];
    let checked = 0;

    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    while (cur < end && slots.length < 5) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        for (let hour = 9; hour <= 16 && slots.length < 5; hour++) {
          const slotStart = new Date(cur);
          slotStart.setHours(hour, 0, 0, 0);
          if (slotStart < start || slotStart > end) continue;
          const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
          checked++;

          const conflict = CALENDAR_EVENTS.some((ev) => {
            if (ev.status === "cancelled") return false;
            if (attendees.length > 0 && !attendees.some((a) => ev.attendees.includes(a))) return false;
            const evS = new Date(ev.start);
            const evE = new Date(ev.end);
            return slotStart < evE && slotEnd > evS;
          });
          if (!conflict) slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return { slots, checked };
  },
};

interface CreateEventArgs {
  title:       string;
  start:       string;
  end:         string;
  attendees:   string[];
  description?: string;
  meetUrl?:    string;
}

const calendarCreateEvent: Tool<CreateEventArgs, { ok: true; event: CalendarEvent }> = {
  name:        "calendar.createEvent",
  owner:       "Calendar",
  description: "Schedule a new calendar event. REQUIRES APPROVAL.",
  riskLevel:   "destructive",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["title", "start", "end", "attendees"],
    properties: {
      title:       { type: "string" },
      start:       { type: "string", description: "ISO 8601." },
      end:         { type: "string", description: "ISO 8601." },
      attendees:   { type: "array",  items: { type: "string" } },
      description: { type: "string" },
      meetUrl:     { type: "string" },
    },
  },
  handler: (args) => {
    // In production this would hit Google Calendar's API. In the
    // demo we just synthesize a CalendarEvent to confirm the action.
    const event: CalendarEvent = {
      id:          `cal_new_${Date.now().toString(36)}`,
      title:       args.title,
      start:       args.start,
      end:         args.end,
      attendees:   args.attendees,
      description: args.description ?? "",
      meetUrl:     args.meetUrl,
      status:      "confirmed",
      organizer:   "jane@openclaw.demo",
    };
    return { ok: true, event };
  },
};

// ─── Slack tools ──────────────────────────────────────────────────

interface SlackSearchArgs { query: string; channel?: string; limit?: number }
interface SlackSearchResult { messages: SlackMessage[] }

const slackSearchMessages: Tool<SlackSearchArgs, SlackSearchResult> = {
  name:        "slack.searchMessages",
  owner:       "Slack",
  description: "Search Slack messages by keyword. Optionally filter to one channel.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query:   { type: "string" },
      channel: { type: "string", description: "e.g. #engineering" },
      limit:   { type: "integer" },
    },
  },
  handler: ({ query, channel, limit = 10 }) => {
    const q = query.toLowerCase();
    const out = SLACK_MESSAGES.filter((m) => {
      if (channel && m.channel !== channel) return false;
      return m.text.toLowerCase().includes(q) || m.user.toLowerCase().includes(q);
    });
    out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    return { messages: out.slice(0, limit) };
  },
};

interface SlackDraftArgs    { channel: string; text: string }
interface SlackDraftResult  { draft: { channel: string; text: string }; preview: string }

const slackDraftMessage: Tool<SlackDraftArgs, SlackDraftResult> = {
  name:        "slack.draftMessage",
  owner:       "Slack",
  description: "Compose a Slack message for review. Does NOT send.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["channel", "text"],
    properties: {
      channel: { type: "string" },
      text:    { type: "string" },
    },
  },
  handler: ({ channel, text }) => ({
    draft:   { channel, text },
    preview: `[Draft to ${channel}] ${text}`,
  }),
};

interface SlackSendArgs   { channel: string; text: string }
interface SlackSendResult { ok: true; channel: string; text: string; ts: string }

const slackSendMessage: Tool<SlackSendArgs, SlackSendResult> = {
  name:        "slack.sendMessage",
  owner:       "Slack",
  description: "Send a Slack message to a channel. REQUIRES APPROVAL.",
  riskLevel:   "destructive",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["channel", "text"],
    properties: {
      channel: { type: "string" },
      text:    { type: "string" },
    },
  },
  handler: ({ channel, text }) => ({
    ok: true, channel, text, ts: new Date().toISOString(),
  }),
};

// ─── GitHub tools ─────────────────────────────────────────────────

interface GhListArgs { state?: string; label?: string; limit?: number }

const githubListPRs: Tool<GhListArgs, { items: GithubItem[] }> = {
  name:        "github.listPRs",
  owner:       "GitHub",
  description: "List pull requests, optionally filtered by state or label.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [],
    properties: {
      state: { type: "string", description: "open | draft | ready_for_review | merged | closed" },
      label: { type: "string" },
      limit: { type: "integer" },
    },
  },
  handler: ({ state, label, limit = 10 }) => {
    const items = GITHUB_ITEMS.filter((g) => {
      if (g.type !== "pr") return false;
      if (state && g.state !== state) return false;
      if (label && !g.labels.includes(label)) return false;
      return true;
    });
    items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return { items: items.slice(0, limit) };
  },
};

const githubListIssues: Tool<GhListArgs, { items: GithubItem[] }> = {
  name:        "github.listIssues",
  owner:       "GitHub",
  description: "List issues, optionally filtered by state or label.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [],
    properties: {
      state: { type: "string" },
      label: { type: "string" },
      limit: { type: "integer" },
    },
  },
  handler: ({ state, label, limit = 10 }) => {
    const items = GITHUB_ITEMS.filter((g) => {
      if (g.type !== "issue") return false;
      if (state && g.state !== state) return false;
      if (label && !g.labels.includes(label)) return false;
      return true;
    });
    items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return { items: items.slice(0, limit) };
  },
};

interface GhSummarizeArgs { number: number; repo?: string }
interface GhSummarizeResult { item: GithubItem | null }

const githubSummarizePR: Tool<GhSummarizeArgs, GhSummarizeResult> = {
  name:        "github.summarizePR",
  owner:       "GitHub",
  description: "Fetch a specific PR's body + recent comments by number.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["number"],
    properties: {
      number: { type: "integer" },
      repo:   { type: "string", description: "e.g. openclaw/repo-alpha" },
    },
  },
  handler: ({ number, repo }) => {
    const item = GITHUB_ITEMS.find((g) =>
      g.number === number && (!repo || g.repo === repo),
    ) ?? null;
    return { item };
  },
};

// ─── Email tools ──────────────────────────────────────────────────

interface EmailSearchArgs { query: string; unread?: boolean; limit?: number }

const emailSearchInbox: Tool<EmailSearchArgs, { emails: EmailMessage[] }> = {
  name:        "email.searchInbox",
  owner:       "Email",
  description: "Keyword search across inbox. Pass `unread: true` to filter unread only.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query:  { type: "string" },
      unread: { type: "boolean" },
      limit:  { type: "integer" },
    },
  },
  handler: ({ query, unread, limit = 10 }) => {
    const q = query.toLowerCase();
    const emails = EMAILS.filter((e) => {
      if (unread === true && e.read) return false;
      if (q.length > 0 && !(
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.from.name.toLowerCase().includes(q) ||
        e.from.email.toLowerCase().includes(q)
      )) return false;
      return true;
    });
    emails.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return { emails: emails.slice(0, limit) };
  },
};

interface EmailDraftArgs    { to: string[]; subject: string; body: string; inReplyTo?: string }
interface EmailDraftResult  { draft: EmailDraftArgs; preview: string }

const emailDraftReply: Tool<EmailDraftArgs, EmailDraftResult> = {
  name:        "email.draft",
  owner:       "Email",
  description: "Compose an email for review. Does NOT send.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["to", "subject", "body"],
    properties: {
      to:        { type: "array",  items: { type: "string" } },
      subject:   { type: "string" },
      body:      { type: "string" },
      inReplyTo: { type: "string", description: "Email ID being replied to." },
    },
  },
  handler: (args) => ({
    draft: args,
    preview:
      `[Draft email to ${args.to.join(", ")}]\nSubject: ${args.subject}\n\n${args.body}`,
  }),
};

interface EmailSendArgs   { to: string[]; subject: string; body: string }
interface EmailSendResult { ok: true; to: string[]; subject: string; sentAt: string }

const emailSend: Tool<EmailSendArgs, EmailSendResult> = {
  name:        "email.send",
  owner:       "Email",
  description: "Send an email. REQUIRES APPROVAL.",
  riskLevel:   "destructive",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["to", "subject", "body"],
    properties: {
      to:      { type: "array", items: { type: "string" } },
      subject: { type: "string" },
      body:    { type: "string" },
    },
  },
  handler: ({ to, subject }) => ({
    ok: true, to, subject, sentAt: new Date().toISOString(),
  }),
};

// ─── Memory tool ──────────────────────────────────────────────────

interface MemoryRecallArgs { query: string; limit?: number }

const memoryRecall: Tool<MemoryRecallArgs, { hits: MemoryHit[] }> = {
  name:        "memory.recall",
  owner:       "Memory",
  description:
    "Search across all data sources (Slack, Calendar, GitHub, Email, SMS) AND past " +
    "workflow runs. Returns the freshest matches first.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query: { type: "string" },
      limit: { type: "integer" },
    },
  },
  handler: ({ query, limit = 10 }) => ({ hits: recallMemory(query, limit) }),
};

// ─── Team lookup (shared, used by orchestrator) ───────────────────

interface PeopleArgs { query?: string }

const teamLookup: Tool<PeopleArgs, { people: typeof TEAM }> = {
  name:        "team.list",
  owner:       "shared",
  description: "List teammates with their emails. Optionally filter by name/role substring.",
  riskLevel:   "safe",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [],
    properties: {
      query: { type: "string", description: "Substring match on name, email, or role." },
    },
  },
  handler: ({ query }) => {
    const q = (query ?? "").toLowerCase();
    const people = q.length === 0
      ? TEAM
      : TEAM.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.role ?? "").toLowerCase().includes(q),
        );
    return { people };
  },
};

// ─── Final-answer tool (terminates the workflow) ──────────────────

interface RespondArgs { answer: string; }

const respond: Tool<RespondArgs, { answer: string }> = {
  name:        "respond",
  owner:       "Orchestrator",
  description: "Send the final answer to the user and terminate the workflow.",
  riskLevel:   "terminal",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["answer"],
    properties: {
      answer: { type: "string", description: "Markdown answer shown to the user." },
    },
  },
  handler: ({ answer }) => ({ answer }),
};

// ─── Registry ─────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  calendarFindSlots,
  calendarCreateEvent,
  slackSearchMessages,
  slackDraftMessage,
  slackSendMessage,
  githubListPRs,
  githubListIssues,
  githubSummarizePR,
  emailSearchInbox,
  emailDraftReply,
  emailSend,
  memoryRecall,
  teamLookup,
  respond,
] as Tool[];

const BY_NAME = new Map<string, Tool>(TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): Tool | undefined {
  return BY_NAME.get(name);
}

/** Names of tools available to a given agent. The Orchestrator gets
 *  a thin slice (memory + respond + delegation hints); each specialist
 *  agent gets their own tools plus shared/memory. Used by step 6's
 *  agent definitions to lock down what each agent can call. */
export function toolsForAgent(agent: AgentName): Tool[] {
  if (agent === "Orchestrator") {
    return TOOLS.filter((t) => t.owner === "Orchestrator" || t.owner === "shared" || t.owner === "Memory");
  }
  return TOOLS.filter((t) => t.owner === agent || t.owner === "shared");
}

/** OpenAI function-calling format. */
export function toOpenAIFunctions(tools: Tool[]): {
  type: "function";
  function: { name: string; description: string; parameters: ToolSchema };
}[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name:        t.name,
      description: t.description,
      parameters:  t.parameters,
    },
  }));
}
