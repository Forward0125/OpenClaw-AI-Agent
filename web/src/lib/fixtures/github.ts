/**
 * GitHub PRs + issues. Includes #142 referenced in Slack and one
 * blocker issue cross-referenced from email.
 */

import type { GithubItem } from "./types";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

export const GITHUB_ITEMS: GithubItem[] = [
  {
    id: "gh_142",
    type: "pr",
    repo: "openclaw/repo-alpha",
    number: 142,
    title: "Refactor auth middleware: scoped session cookies + rate-limit reset",
    body:
      "Splits the legacy auth middleware into two modules and pins the session cookie path to `/`. " +
      "Resets the rate-limit headers on successful auth.\n\n" +
      "Linked to launch readiness for Project Alpha.",
    author:    "Mike Park",
    state:     "ready_for_review",
    labels:    ["auth", "alpha-blocker", "needs-review"],
    reviewers: ["Priya Patel", "Tom Reynolds"],
    assignees: ["Mike Park"],
    url:       "https://github.com/openclaw/repo-alpha/pull/142",
    updatedAt: hoursAgo(1),
    comments: [
      { author: "Tom Reynolds", body: "Two notes on the rate limiter — DM'd them.", ts: hoursAgo(2.5) },
      { author: "Mike Park",    body: "Addressed; please re-review.",                ts: hoursAgo(1) },
    ],
  },

  {
    id: "gh_140",
    type: "pr",
    repo: "openclaw/repo-alpha",
    number: 140,
    title: "Add audit log for high-risk actions",
    body:
      "Captures every state-changing action with actor + timestamp into the `audit_log` table. " +
      "Final review needed before merge — see GitHub PR #140 in the alerts panel.",
    author:    "Tom Reynolds",
    state:     "ready_for_review",
    labels:    ["security", "compliance"],
    reviewers: ["Mike Park", "Jane Doe"],
    assignees: ["Tom Reynolds"],
    url:       "https://github.com/openclaw/repo-alpha/pull/140",
    updatedAt: hoursAgo(8),
    comments: [
      { author: "Mike Park", body: "Approved. Jane, want to take one more look at the table schema?", ts: hoursAgo(7) },
    ],
  },

  {
    id: "gh_138",
    type: "pr",
    repo: "openclaw/repo-alpha",
    number: 138,
    title: "Onboarding flow — implement Figma v2",
    body:
      "Implements the design from Estedam's latest Figma. Adds the keyboard shortcut hint to step 2 " +
      "per design feedback in #design-ops.",
    author:    "Tom Reynolds",
    state:     "draft",
    labels:    ["ui", "alpha"],
    reviewers: [],
    assignees: ["Tom Reynolds"],
    url:       "https://github.com/openclaw/repo-alpha/pull/138",
    updatedAt: hoursAgo(20),
  },

  {
    id: "gh_136",
    type: "pr",
    repo: "openclaw/repo-alpha",
    number: 136,
    title: "Fix flaky integration test in flow.test.ts",
    body:
      "Adds a barrier to the cleanup hook so the dropbox isn't deleted before the assertion. " +
      "Closes #145.",
    author:    "Priya Patel",
    state:     "merged",
    labels:    ["test", "ci"],
    reviewers: ["Mike Park"],
    assignees: ["Priya Patel"],
    url:       "https://github.com/openclaw/repo-alpha/pull/136",
    updatedAt: hoursAgo(28),
  },

  {
    id: "gh_133",
    type: "pr",
    repo: "openclaw/repo-alpha",
    number: 133,
    title: "Bump dependencies (lockfile-only)",
    body:
      "Routine weekly lockfile bump. No source changes.",
    author:    "Mike Park",
    state:     "merged",
    labels:    ["chore"],
    url:       "https://github.com/openclaw/repo-alpha/pull/133",
    updatedAt: daysAgo(2),
  },

  // Issues
  {
    id: "gh_145",
    type: "issue",
    repo: "openclaw/repo-alpha",
    number: 145,
    title: "Race condition in flow.test.ts cleanup",
    body:
      "CI flakes on roughly 60% of runs. The teardown deletes the temp dir " +
      "before the assertion's last `await` completes. Reproducible with `repeat 5`.",
    author:    "Tom Reynolds",
    state:     "closed",
    labels:    ["test", "ci"],
    assignees: ["Priya Patel"],
    url:       "https://github.com/openclaw/repo-alpha/issues/145",
    updatedAt: hoursAgo(28),
  },

  {
    id: "gh_148",
    type: "issue",
    repo: "openclaw/repo-alpha",
    number: 148,
    title: "Document rollback plan for Project Alpha launch",
    body:
      "Runbook covers deploy steps but not rollback. Need a step-by-step " +
      "for reverting the auth refactor if cookies regress.",
    author:    "Priya Patel",
    state:     "open",
    labels:    ["docs", "alpha-blocker"],
    assignees: ["Mike Park"],
    url:       "https://github.com/openclaw/repo-alpha/issues/148",
    updatedAt: minutesAgo(40),
  },

  {
    id: "gh_125",
    type: "issue",
    repo: "openclaw/customer-acme",
    number: 12,
    title: "[Acme] SSO config: SAML response signature mismatch",
    body:
      "Acme is hitting a signature-mismatch on the SAML response. " +
      "Need to verify our IdP cert chain. Customer renewal in 6 weeks.",
    author:    "Alex Rivera",
    state:     "open",
    labels:    ["customer", "sso", "renewal-blocker"],
    assignees: ["Mike Park"],
    url:       "https://github.com/openclaw/customer-acme/issues/12",
    updatedAt: hoursAgo(11),
  },
];
