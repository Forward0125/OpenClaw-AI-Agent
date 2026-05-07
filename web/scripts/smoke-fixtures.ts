/**
 * Sanity + correctness checks for the fixture lib.
 * Run: npx tsx scripts/smoke-fixtures.ts
 */

import {
  CALENDAR_EVENTS,
  EMAILS,
  FIXTURE_COUNTS,
  GITHUB_ITEMS,
  SLACK_MESSAGES,
  SMS_MESSAGES,
  searchFixtures,
} from "../src/lib/fixtures/index.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

console.log("[fixtures] counts");
console.log(`  calendar=${FIXTURE_COUNTS.calendar} slack=${FIXTURE_COUNTS.slack} github=${FIXTURE_COUNTS.github} email=${FIXTURE_COUNTS.email} sms=${FIXTURE_COUNTS.sms}`);

check("calendar non-empty", CALENDAR_EVENTS.length > 0);
check("slack non-empty",    SLACK_MESSAGES.length > 0);
check("github non-empty",   GITHUB_ITEMS.length > 0);
check("emails non-empty",   EMAILS.length > 0);
check("sms non-empty",      SMS_MESSAGES.length > 0);

// All ISO strings parseable
{
  let bad = 0;
  for (const c of CALENDAR_EVENTS) {
    if (Number.isNaN(Date.parse(c.start))) bad++;
    if (Number.isNaN(Date.parse(c.end)))   bad++;
  }
  for (const m of SLACK_MESSAGES) if (Number.isNaN(Date.parse(m.ts))) bad++;
  for (const g of GITHUB_ITEMS)  if (Number.isNaN(Date.parse(g.updatedAt))) bad++;
  for (const e of EMAILS)        if (Number.isNaN(Date.parse(e.date))) bad++;
  for (const s of SMS_MESSAGES)  if (Number.isNaN(Date.parse(s.date))) bad++;
  check("all ISO timestamps parse", bad === 0, `${bad} bad`);
}

// IDs unique within each source
function uniqueIds(label: string, ids: string[]): void {
  check(`${label}: unique ids`, new Set(ids).size === ids.length);
}
uniqueIds("calendar", CALENDAR_EVENTS.map((c) => c.id));
uniqueIds("slack",    SLACK_MESSAGES.map((m) => m.id));
uniqueIds("github",   GITHUB_ITEMS.map((g) => g.id));
uniqueIds("emails",   EMAILS.map((e) => e.id));
uniqueIds("sms",      SMS_MESSAGES.map((s) => s.id));

// Cross-references — these are the demo's value prop
{
  const slackMentionsPR = SLACK_MESSAGES.some((m) => m.text.includes("PR #142"));
  const ghHasPR142      = GITHUB_ITEMS.some((g) => g.number === 142);
  check("slack mentions PR #142",   slackMentionsPR);
  check("github has PR #142",       ghHasPR142);

  const emailMentionsAlpha = EMAILS.some((e) => /Project Alpha/.test(e.subject) || /Project Alpha/.test(e.body));
  const calendarHasAlpha   = CALENDAR_EVENTS.some((c) => /Project Alpha/.test(c.title));
  check("email mentions Project Alpha",    emailMentionsAlpha);
  check("calendar has Project Alpha event", calendarHasAlpha);

  const ssoEmail = EMAILS.some((e) => /SSO|SAML/i.test(e.body) || /SSO|SAML/i.test(e.subject));
  const ssoIssue = GITHUB_ITEMS.some((g) => /SSO|SAML/i.test(g.title) || /SSO|SAML/i.test(g.body));
  check("email mentions SSO/SAML",  ssoEmail);
  check("github has SSO/SAML issue", ssoIssue);
}

// Search smoke
{
  const r1 = searchFixtures("alpha");
  check(`search "alpha" returns hits across kinds`, r1.length > 0,
        `${new Set(r1.map((h) => h.kind)).size} kinds, ${r1.length} hits`);

  const r2 = searchFixtures("PR #142");
  check(`search "PR #142" finds at least 2 hits (slack + github)`, r2.length >= 2);

  const r3 = searchFixtures("sso");
  const kinds = new Set(r3.map((h) => h.kind));
  check(`search "sso" hits both email and github`,
        kinds.has("email") && kinds.has("github"),
        `kinds: ${[...kinds].join(",")}`);

  const r4 = searchFixtures("no-such-thing-anywhere");
  check(`search nonsense returns 0 hits`, r4.length === 0);

  // Newest-first ordering
  for (let i = 1; i < r1.length; i++) {
    if (Date.parse(r1[i - 1].date) < Date.parse(r1[i].date)) {
      check("search results newest-first", false, `idx ${i} out of order`);
      break;
    }
  }
}

console.log(process.exitCode ? "\n[smoke] FAIL" : "\n[smoke] PASS");
