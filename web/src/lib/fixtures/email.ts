/**
 * Email fixtures. Cross-references the SSO issue from GitHub and
 * the launch review from calendar.
 */

import type { EmailMessage } from "./types";
import { TEAM } from "./team";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

const sarah  = TEAM.find((p) => p.id === "u_sarah")!;
const mike   = TEAM.find((p) => p.id === "u_mike")!;
const alex   = TEAM.find((p) => p.id === "u_alex")!;
const estedam = TEAM.find((p) => p.id === "u_estedam")!;

const ACME: EmailMessage["from"] = {
  id:    "u_dana",
  name:  "Dana Wexler",
  email: "dana.wexler@acmecorp.example",
  role:  "VP Engineering, Acme Corp",
};

const SEQUOIA: EmailMessage["from"] = {
  id:    "u_partner",
  name:  "Lin Chao",
  email: "lin@sequoia.example",
  role:  "Investor",
};

export const EMAILS: EmailMessage[] = [
  {
    id: "email_1",
    from: ACME,
    to: ["jane@openclaw.demo", "alex@openclaw.demo"],
    subject: "Quick prep before our QBR call",
    body:
      "Hi Jane,\n\n" +
      "Looking forward to today's check-in. Two things on my list:\n\n" +
      "1) The SAML signature mismatch — Alex flagged it, your team filed " +
      "GH issue #12. Any update?\n" +
      "2) Pricing for the next renewal cycle. We'd like to get a draft 30 days early.\n\n" +
      "See you at 5pm.\n\nDana",
    date: hoursAgo(8),
    read: false,
    starred: true,
  },

  {
    id: "email_2",
    from: SEQUOIA,
    to: ["jane@openclaw.demo"],
    subject: "Coffee today — quick refresher",
    body:
      "Jane — looking forward to today. Just want to flag that Mark from our " +
      "growth team will likely join. He's been digging into your activation " +
      "metrics from last quarter and has a few questions.\n\n" +
      "Suggested questions to noodle on:\n" +
      "- Is the new onboarding flow live yet?\n" +
      "- Day-7 retention trend since the auth refactor?\n\n" +
      "Lin",
    date: daysAgo(1, 17),
    read: true,
  },

  {
    id: "email_3",
    from: sarah,
    to: ["jane@openclaw.demo"],
    cc: ["mike@openclaw.demo"],
    subject: "Project Alpha — go/no-go meeting tomorrow",
    body:
      "Reminder: launch review tomorrow at 2pm. Please come with your section of " +
      "the runbook ready. I'll send out the agenda an hour before.\n\n" +
      "Open blockers I'm tracking:\n" +
      "- PR #142 (auth) — in review\n" +
      "- Rollback plan documentation (issue #148) — assigned to Mike\n\n" +
      "Sarah",
    date: hoursAgo(12),
    read: true,
  },

  {
    id: "email_4",
    from: mike,
    to: ["jane@openclaw.demo"],
    subject: "Re: hiring backfill",
    body:
      "Onsite went well — Priya is now in seat and ramping fast (already shipped " +
      "PR #136). For the second backfill, I'd push the debrief out to next week " +
      "since two interviewers are at a conference. Calendar invite for Wednesday.\n\nMike",
    date: daysAgo(1, 16),
    read: true,
  },

  {
    id: "email_5",
    from: alex,
    to: ["jane@openclaw.demo"],
    subject: "Acme renewal — I'd like to bring forward by 1 week",
    body:
      "Hey Jane — Dana from Acme is asking if we can move the renewal call " +
      "forward by a week. They want to chat about SSO ahead of their own quarterly " +
      "release. I'd suggest taking it; I think their renewal is at risk if SSO " +
      "isn't resolved.\n\n" +
      "Alex",
    date: hoursAgo(10),
    read: false,
  },

  {
    id: "email_6",
    from: estedam,
    to: ["jane@openclaw.demo", "tom@openclaw.demo"],
    subject: "Onboarding v2 — final Figma",
    body:
      "Final pass is up at " +
      "https://www.figma.com/design/openclaw/onboarding-flow .\n\n" +
      "Changes from yesterday's review:\n" +
      "- Keyboard shortcut hint moved to step 2\n" +
      "- Tightened the empty state on step 4\n" +
      "- Dark mode tokens locked in\n\n" +
      "Tom — engineering can pick this up whenever you're ready.\n\nE.",
    date: hoursAgo(7),
    read: true,
  },

  // Noise — newsletters & vendor mail
  {
    id: "email_7",
    from: { id: "u_vendor", name: "AWS Billing", email: "no-reply@aws.amazon.example" },
    to: ["jane@openclaw.demo"],
    subject: "Your AWS Invoice for last month is available",
    body: "Auto-generated billing notification.",
    date: daysAgo(2, 7),
    read: true,
  },
  {
    id: "email_8",
    from: { id: "u_vendor2", name: "Hacker News", email: "digest@hn.example" },
    to: ["jane@openclaw.demo"],
    subject: "Top stories — March 5",
    body: "Newsletter content.",
    date: daysAgo(1, 8),
    read: false,
  },

  // Recent — fresh email triggering an agent action
  {
    id: "email_9",
    from: ACME,
    to: ["jane@openclaw.demo"],
    subject: "Following up on SSO — any ETA?",
    body:
      "Jane,\n\nWe didn't get to fully cover SSO on the call. Can you " +
      "share an ETA on the SAML signature fix? Our security review is " +
      "blocking on this.\n\nThanks,\nDana",
    date: minutesAgo(35),
    read: false,
    starred: true,
  },
];
