/**
 * Shared types for the demo fixtures. The point of these is that the
 * agent tools (lib/tools.ts in step 4) read these EXACT shapes — so
 * if you ever wanted to swap in a real Slack/Calendar/GitHub OAuth
 * client, you'd implement the same return types and the agents
 * wouldn't notice the difference.
 */

export type IsoDate = string;       // ISO 8601 string
export type Email   = string;

export interface Person {
  id:    string;
  name:  string;
  email: Email;
  role?: string;
}

// ─── Calendar ─────────────────────────────────────────────────────

export type CalendarStatus = "confirmed" | "tentative" | "cancelled";

export interface CalendarEvent {
  id:          string;            // "cal_..."
  title:       string;
  start:       IsoDate;
  end:         IsoDate;
  attendees:   Email[];
  description: string;
  location?:   string;
  meetUrl?:    string;
  status:      CalendarStatus;
  organizer:   Email;
  recurring?:  boolean;
}

// ─── Slack ────────────────────────────────────────────────────────

export interface SlackMessage {
  id:        string;              // "slack_..."
  channel:   string;              // "#engineering"
  user:      string;              // display name
  text:      string;
  ts:        IsoDate;
  threadId?: string;              // parent message id; absent on root
  mentions?: string[];            // resolved @mentions (display names)
  reactions?: { emoji: string; count: number }[];
  isReply?:  boolean;
}

// ─── GitHub ───────────────────────────────────────────────────────

export type GithubState =
  | "open"
  | "draft"
  | "ready_for_review"
  | "approved"
  | "merged"
  | "closed";

export interface GithubItem {
  id:        string;              // "gh_..."
  type:      "pr" | "issue";
  repo:      string;              // "team/repo"
  number:    number;
  title:     string;
  body:      string;
  author:    string;
  state:     GithubState;
  labels:    string[];
  reviewers?: string[];
  assignees?: string[];
  url:       string;
  updatedAt: IsoDate;
  comments?: { author: string; body: string; ts: IsoDate }[];
}

// ─── Email ────────────────────────────────────────────────────────

export interface EmailMessage {
  id:        string;              // "email_..."
  from:      Person;
  to:        Email[];
  cc?:       Email[];
  subject:   string;
  body:      string;
  date:      IsoDate;
  threadId?: string;
  read:      boolean;
  starred?:  boolean;
}

// ─── SMS ──────────────────────────────────────────────────────────

export interface SmsMessage {
  id:        string;              // "sms_..."
  from:      string;              // "+15551234567" or short code
  to:        string;
  body:      string;
  date:      IsoDate;
  direction: "inbound" | "outbound";
}

// ─── Combined ─────────────────────────────────────────────────────

export type AnyFixture =
  | CalendarEvent
  | SlackMessage
  | GithubItem
  | EmailMessage
  | SmsMessage;

export type FixtureKind = "calendar" | "slack" | "github" | "email" | "sms";
