/**
 * Calendar fixtures. Mix of past + upcoming, recurring + one-off,
 * with some intentional cross-references to Slack / email fixtures
 * (e.g. "Project Alpha launch review" appears in a Slack thread and
 * a GitHub PR description).
 */

import type { CalendarEvent } from "./types";
import { addMinutes, daysAgo, daysFromNow, hoursAgo, hoursFromNow } from "./time";
import { TEAM } from "./team";

const ALL = TEAM.map((p) => p.email);
const eng = TEAM.filter((p) => /Eng|Engineer/.test(p.role ?? "")).map((p) => p.email);
const product = TEAM.filter((p) => /Product|CEO|Eng Lead/.test(p.role ?? "")).map((p) => p.email);

export const CALENDAR_EVENTS: CalendarEvent[] = [
  // Past — gives the agent grounding for "what happened this week" queries
  {
    id: "cal_past_1",
    title: "Eng Standup",
    start: daysAgo(2, 9), end: addMinutes(daysAgo(2, 9), 15),
    attendees: eng, organizer: "mike@openclaw.demo",
    description: "Daily 9am sync.",
    meetUrl: "https://meet.google.com/eng-standup",
    status: "confirmed", recurring: true,
  },
  {
    id: "cal_past_2",
    title: "1:1 — Jane / Mike",
    start: daysAgo(1, 14), end: addMinutes(daysAgo(1, 14), 30),
    attendees: ["jane@openclaw.demo", "mike@openclaw.demo"],
    organizer: "jane@openclaw.demo",
    description: "Weekly skip-level. Topics: PR #142, hiring backfill, Q2 roadmap.",
    status: "confirmed", recurring: true,
  },
  {
    id: "cal_past_3",
    title: "Project Alpha — design review",
    start: daysAgo(3, 11), end: addMinutes(daysAgo(3, 11), 45),
    attendees: ["jane@openclaw.demo", "estedam@openclaw.demo", "sarah@openclaw.demo"],
    organizer: "estedam@openclaw.demo",
    description: "Final pass on the onboarding flow before eng handoff.",
    status: "confirmed",
  },

  // Today
  {
    id: "cal_today_1",
    title: "Eng Standup",
    start: hoursAgo(2), end: addMinutes(hoursAgo(2), 15),
    attendees: eng, organizer: "mike@openclaw.demo",
    description: "Daily 9am sync.",
    status: "confirmed", recurring: true,
  },
  {
    id: "cal_today_2",
    title: "Investor coffee — Sequoia",
    start: hoursFromNow(3), end: addMinutes(hoursFromNow(3), 60),
    attendees: ["jane@openclaw.demo"],
    organizer: "jane@openclaw.demo",
    description: "Casual chat, no deck. Bring iPad with the live demo.",
    location: "Verve, Palo Alto",
    status: "confirmed",
  },
  {
    id: "cal_today_3",
    title: "Customer call — Acme Corp",
    start: hoursFromNow(5), end: addMinutes(hoursFromNow(5), 30),
    attendees: ["jane@openclaw.demo", "alex@openclaw.demo"],
    organizer: "alex@openclaw.demo",
    description: "Quarterly check-in with their VP Eng. Renewal due in 6 weeks.",
    meetUrl: "https://meet.google.com/acme-qbr",
    status: "confirmed",
  },

  // Tomorrow
  {
    id: "cal_tom_1",
    title: "Eng Standup",
    start: daysFromNow(1, 9), end: addMinutes(daysFromNow(1, 9), 15),
    attendees: eng, organizer: "mike@openclaw.demo",
    description: "Daily 9am sync.",
    status: "confirmed", recurring: true,
  },
  {
    id: "cal_tom_2",
    title: "Project Alpha launch review",
    start: daysFromNow(1, 14), end: addMinutes(daysFromNow(1, 14), 60),
    attendees: ALL, organizer: "sarah@openclaw.demo",
    description: "Go/no-go for next-week launch. Walk through the runbook.",
    meetUrl: "https://meet.google.com/alpha-launch",
    status: "confirmed",
  },

  // Next week
  {
    id: "cal_next_1",
    title: "Project Alpha — go-live",
    start: daysFromNow(7, 10), end: addMinutes(daysFromNow(7, 10), 90),
    attendees: ALL, organizer: "sarah@openclaw.demo",
    description: "Launch window. Mike on incident command.",
    status: "confirmed",
  },
  {
    id: "cal_next_2",
    title: "Team Sync — weekly",
    start: daysFromNow(5, 11), end: addMinutes(daysFromNow(5, 11), 30),
    attendees: ALL, organizer: "jane@openclaw.demo",
    description: "All-hands weekly. Standing slot — Tuesdays 11am.",
    status: "confirmed", recurring: true,
  },
  {
    id: "cal_next_3",
    title: "1:1 — Jane / Sarah",
    start: daysFromNow(4, 15), end: addMinutes(daysFromNow(4, 15), 30),
    attendees: ["jane@openclaw.demo", "sarah@openclaw.demo"],
    organizer: "jane@openclaw.demo",
    description: "PM check-in. Roadmap reprioritization.",
    status: "confirmed", recurring: true,
  },
  {
    id: "cal_next_4",
    title: "Design review — settings v2",
    start: daysFromNow(3, 14), end: addMinutes(daysFromNow(3, 14), 45),
    attendees: ["jane@openclaw.demo", "estedam@openclaw.demo", "tom@openclaw.demo"],
    organizer: "estedam@openclaw.demo",
    description: "First pass at the redesigned settings page.",
    status: "tentative",
  },
  {
    id: "cal_next_5",
    title: "Hiring debrief — eng candidate",
    start: daysFromNow(2, 16), end: addMinutes(daysFromNow(2, 16), 60),
    attendees: ["jane@openclaw.demo", "mike@openclaw.demo", "priya@openclaw.demo"],
    organizer: "mike@openclaw.demo",
    description: "Decision meeting after onsite for backend role.",
    status: "confirmed",
  },

  // Conflicts to make scheduling demos interesting
  {
    id: "cal_next_6",
    title: "Marketing — campaign kickoff",
    start: daysFromNow(2, 14), end: addMinutes(daysFromNow(2, 14), 60),
    attendees: ["jane@openclaw.demo", "alex@openclaw.demo"],
    organizer: "alex@openclaw.demo",
    description: "Quarterly campaign planning.",
    status: "confirmed",
  },

  // Travel placeholder so "find time next week" has to skip a day
  {
    id: "cal_next_7",
    title: "[OOO] Jane — flight to NYC",
    start: daysFromNow(6, 8), end: addMinutes(daysFromNow(6, 8), 360),
    attendees: ["jane@openclaw.demo"],
    organizer: "jane@openclaw.demo",
    description: "Travel block. No meetings.",
    status: "confirmed",
  },
];
