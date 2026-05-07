/**
 * Slack fixtures across 5 channels. Cross-references both calendar
 * (Project Alpha, design review) and GitHub (PR #142, repo-alpha).
 */

import type { SlackMessage } from "./types";
import { hoursAgo, minutesAgo, daysAgo } from "./time";

export const SLACK_MESSAGES: SlackMessage[] = [
  // #engineering — recent
  { id: "slack_e1", channel: "#engineering", user: "Mike Park", text: "PR #142 is ready for review. Touches the auth middleware — keep an eye on the session cookie path.", ts: hoursAgo(4), reactions: [{ emoji: "👀", count: 2 }] },
  { id: "slack_e2", channel: "#engineering", user: "Priya Patel", text: "Looking at it now.", ts: hoursAgo(3.8), threadId: "slack_e1", isReply: true },
  { id: "slack_e3", channel: "#engineering", user: "Tom Reynolds", text: "I left two comments on the rate limiter. Otherwise LGTM.", ts: hoursAgo(2.5), threadId: "slack_e1", isReply: true },
  { id: "slack_e4", channel: "#engineering", user: "Mike Park", text: "Addressed both. Re-requesting review.", ts: hoursAgo(1), threadId: "slack_e1", isReply: true },

  { id: "slack_e5", channel: "#engineering", user: "Tom Reynolds", text: "Anyone seeing flakes on the integration test for `flow.test.ts`? 3 of last 5 CI runs failed on it.", ts: hoursAgo(6) },
  { id: "slack_e6", channel: "#engineering", user: "Priya Patel", text: "Yeah, looks like a race condition on cleanup. Filed issue #145.", ts: hoursAgo(5.5), threadId: "slack_e5", isReply: true },

  { id: "slack_e7", channel: "#engineering", user: "Mike Park", text: "Reminder: code freeze for Project Alpha is end of day Thursday.", ts: hoursAgo(20), reactions: [{ emoji: "🚀", count: 4 }, { emoji: "✅", count: 5 }] },

  // #design-ops — referenced in screenshot 01_3
  { id: "slack_d1", channel: "#design-ops", user: "Estedam Origen", text: "Updated the onboarding-flow Figma. Three breakpoints + dark mode covered. Link in thread.", ts: hoursAgo(8) },
  { id: "slack_d2", channel: "#design-ops", user: "Estedam Origen", text: "https://www.figma.com/design/openclaw/onboarding-flow", ts: hoursAgo(8), threadId: "slack_d1", isReply: true },
  { id: "slack_d3", channel: "#design-ops", user: "Sarah Chen", text: "This is great. One ask: can we surface the keyboard shortcut hint earlier?", ts: hoursAgo(7), threadId: "slack_d1", isReply: true },
  { id: "slack_d4", channel: "#design-ops", user: "Estedam Origen", text: "Yeah, moving it to step 2.", ts: hoursAgo(6.8), threadId: "slack_d1", isReply: true },

  { id: "slack_d5", channel: "#design-ops", user: "Tom Reynolds", text: "Settings v2 — first cut of the redesign is up. Eyeballing for next week's review.", ts: hoursAgo(30) },

  // #product
  { id: "slack_p1", channel: "#product", user: "Sarah Chen", text: "Project Alpha launch review is on the calendar tomorrow at 2pm. Please come with your runbook section ready.", ts: hoursAgo(12), reactions: [{ emoji: "📋", count: 3 }] },
  { id: "slack_p2", channel: "#product", user: "Alex Rivera", text: "Acme renewal call moved up — they want to chat about the new SSO config too. Heads up @jane.", ts: hoursAgo(10), mentions: ["Jane Doe"] },
  { id: "slack_p3", channel: "#product", user: "Sarah Chen", text: "Q2 roadmap draft is in the drive. Comments by Friday please.", ts: daysAgo(1, 14) },

  // #incidents
  { id: "slack_i1", channel: "#incidents", user: "Mike Park", text: "Heads up: minor degradation on the webhook ingest queue around 11:40 UTC. Backlog cleared in 8 min, no customer impact. Postmortem in #incidents-postmortem.", ts: hoursAgo(15), reactions: [{ emoji: "🔔", count: 2 }] },

  // #general
  { id: "slack_g1", channel: "#general", user: "Jane Doe", text: "Welcome Priya 👋 — joining us as Senior Engineer this week. Make sure you say hi.", ts: daysAgo(2, 10), reactions: [{ emoji: "👋", count: 8 }, { emoji: "🎉", count: 6 }] },
  { id: "slack_g2", channel: "#general", user: "Priya Patel", text: "Thanks Jane! Excited to be here. Already digging into the auth refactor.", ts: daysAgo(2, 11), threadId: "slack_g1", isReply: true },

  { id: "slack_g3", channel: "#general", user: "Sarah Chen", text: "All-hands moved to Tuesday next week. Calendar invites going out today.", ts: daysAgo(1, 16), reactions: [{ emoji: "✅", count: 7 }] },

  // #standup (more telegraphic, dated)
  { id: "slack_s1", channel: "#standup", user: "Tom Reynolds", text: "Y: PR #142 review, fixed flake on `flow.test.ts`. T: settings v2 wireframes. B: design feedback.", ts: hoursAgo(4) },
  { id: "slack_s2", channel: "#standup", user: "Priya Patel", text: "Y: onboarding for Project Alpha; ramping on auth code. T: draft a PR for the missing rate-limit metric. B: none.", ts: hoursAgo(3.9) },
  { id: "slack_s3", channel: "#standup", user: "Mike Park", text: "Y: #142 reviews, incident response. T: launch runbook walkthrough. B: customer follow-up on SSO config.", ts: hoursAgo(3.8) },

  // Most recent — what's "live" right now
  { id: "slack_e8", channel: "#engineering", user: "Priya Patel", text: "Quick Q: do we have a rollback plan documented for tomorrow's launch? I see the runbook has a deploy section but no rollback.", ts: minutesAgo(45), mentions: ["Mike Park"] },
  { id: "slack_e9", channel: "#engineering", user: "Mike Park", text: "Good catch. Adding it before EOD.", ts: minutesAgo(30), threadId: "slack_e8", isReply: true },
];
