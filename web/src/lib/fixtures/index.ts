/**
 * Public fixture surface. The agent tools (step 4) import from here;
 * if you ever swap real OAuth in, replace this file with calls into
 * your Slack / Calendar / GitHub / Email / Twilio clients keeping the
 * same return types — no agent code has to change.
 */

export type {
  AnyFixture,
  CalendarEvent,
  CalendarStatus,
  EmailMessage,
  FixtureKind,
  GithubItem,
  GithubState,
  IsoDate,
  Person,
  SlackMessage,
  SmsMessage,
} from "./types";

export { TEAM, ME, findPerson } from "./team";

export { CALENDAR_EVENTS } from "./calendar";
export { SLACK_MESSAGES }   from "./slack";
export { GITHUB_ITEMS }     from "./github";
export { EMAILS }           from "./email";
export { SMS_MESSAGES }     from "./sms";

import type { CalendarEvent, EmailMessage, GithubItem, SlackMessage, SmsMessage } from "./types";
import { CALENDAR_EVENTS } from "./calendar";
import { SLACK_MESSAGES }   from "./slack";
import { GITHUB_ITEMS }     from "./github";
import { EMAILS }           from "./email";
import { SMS_MESSAGES }     from "./sms";

/** Total count across every fixture source — used by the analytics
 *  dashboard's "Integrations Active 5/5" tile. */
export const FIXTURE_COUNTS = {
  calendar: CALENDAR_EVENTS.length,
  slack:    SLACK_MESSAGES.length,
  github:   GITHUB_ITEMS.length,
  email:    EMAILS.length,
  sms:      SMS_MESSAGES.length,
};

/** Crude keyword search across every fixture source. Good enough
 *  for the demo's "Memory" agent — production would use embeddings.
 *  Returns hits sorted newest-first per source.
 */
export interface SearchHit {
  kind:    "calendar" | "slack" | "github" | "email" | "sms";
  id:      string;
  title:   string;            // human-readable summary
  snippet: string;            // short excerpt with the matched term
  date:    string;            // ISO
  source:  CalendarEvent | SlackMessage | GithubItem | EmailMessage | SmsMessage;
}

export function searchFixtures(query: string, limit = 20): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const hits: SearchHit[] = [];

  for (const c of CALENDAR_EVENTS) {
    if (matches(q, c.title, c.description)) {
      hits.push({
        kind: "calendar", id: c.id,
        title: c.title,
        snippet: c.description,
        date: c.start, source: c,
      });
    }
  }
  for (const m of SLACK_MESSAGES) {
    if (matches(q, m.text, m.user, m.channel)) {
      hits.push({
        kind: "slack", id: m.id,
        title: `${m.channel} — ${m.user}`,
        snippet: m.text,
        date: m.ts, source: m,
      });
    }
  }
  for (const g of GITHUB_ITEMS) {
    if (matches(q, g.title, g.body, ...g.labels)) {
      hits.push({
        kind: "github", id: g.id,
        title: `${g.repo}#${g.number}: ${g.title}`,
        snippet: g.body.slice(0, 200),
        date: g.updatedAt, source: g,
      });
    }
  }
  for (const e of EMAILS) {
    if (matches(q, e.subject, e.body, e.from.name, e.from.email)) {
      hits.push({
        kind: "email", id: e.id,
        title: `${e.from.name}: ${e.subject}`,
        snippet: e.body.slice(0, 200),
        date: e.date, source: e,
      });
    }
  }
  for (const s of SMS_MESSAGES) {
    if (matches(q, s.body)) {
      hits.push({
        kind: "sms", id: s.id,
        title: `SMS ${s.direction === "inbound" ? "from" : "to"} ${s.from === "+15555550199" ? s.to : s.from}`,
        snippet: s.body,
        date: s.date, source: s,
      });
    }
  }

  hits.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return hits.slice(0, limit);
}

function matches(q: string, ...fields: (string | undefined)[]): boolean {
  for (const f of fields) {
    if (f && f.toLowerCase().includes(q)) return true;
  }
  return false;
}
