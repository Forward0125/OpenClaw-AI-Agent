/**
 * Tool-catalog correctness checks.
 * Run: npx tsx scripts/smoke-tools.ts
 */

import {
  TOOLS,
  getTool,
  toOpenAIFunctions,
  toolsForAgent,
  type Tool,
} from "../src/lib/tools.ts";

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

console.log("[catalog] structure");

check("at least 14 tools",          TOOLS.length >= 14, `got ${TOOLS.length}`);
check("getTool('respond') works",   getTool("respond") !== undefined);
check("getTool('nonexistent') 404", getTool("nonexistent") === undefined);

// Every tool has unique name + non-empty description
{
  const names = TOOLS.map((t) => t.name);
  check("unique names",       new Set(names).size === names.length);
  for (const t of TOOLS) {
    if (t.description.length < 10) check(`${t.name}: description too short`, false);
    if (!t.parameters.properties) check(`${t.name}: missing parameters.properties`, false);
  }
}

// At least one destructive tool, exactly one terminal tool
{
  const destructive = TOOLS.filter((t) => t.riskLevel === "destructive");
  const terminal    = TOOLS.filter((t) => t.riskLevel === "terminal");
  check(">=2 destructive tools", destructive.length >= 2, `got ${destructive.length}`);
  check("exactly 1 terminal tool", terminal.length === 1);
  check("terminal is 'respond'",   terminal[0]?.name === "respond");
}

// Per-agent slicing
{
  const calTools  = toolsForAgent("Calendar");
  const slackTools = toolsForAgent("Slack");
  const orchTools = toolsForAgent("Orchestrator");
  check("Calendar agent gets calendar.* tools", calTools.every((t) =>
    t.owner === "Calendar" || t.owner === "shared"));
  check("Slack agent gets slack.* tools",        slackTools.every((t) =>
    t.owner === "Slack" || t.owner === "shared"));
  check("Orchestrator can call respond",         orchTools.some((t) => t.name === "respond"));
  check("Orchestrator can NOT call email.send",  !orchTools.some((t) => t.name === "email.send"));
}

// OpenAI function format
{
  const fns = toOpenAIFunctions(TOOLS);
  check("OpenAI fn count matches",   fns.length === TOOLS.length);
  check("each fn has type=function", fns.every((f) => f.type === "function"));
  check("each fn has parameters",    fns.every((f) => f.function.parameters.type === "object"));
}

console.log("\n[handlers] live execution against fixtures");

// findSlots: should return real free slots over the next 7 days
async function exec(t: Tool, args: unknown): Promise<unknown> {
  return Promise.resolve(t.handler(args));
}

(async () => {
  const findSlots = getTool("calendar.findSlots")!;
  const fsResult = await exec(findSlots, {
    startDate:    new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    endDate:      new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    durationMin:  30,
    attendees:    ["jane@openclaw.demo", "sarah@openclaw.demo"],
  }) as { slots: { start: string; end: string }[]; checked: number };
  check("findSlots returned >0 slots",  fsResult.slots.length > 0,
        `got ${fsResult.slots.length}`);
  check("findSlots checked >0 candidates", fsResult.checked > 0,
        `checked ${fsResult.checked}`);

  // slack.searchMessages for "PR #142"
  const slackSearch = getTool("slack.searchMessages")!;
  const ssResult = await exec(slackSearch, { query: "PR #142", limit: 5 });
  check("slack.searchMessages found PR #142",
        Array.isArray((ssResult as { messages: unknown[] }).messages) &&
        (ssResult as { messages: unknown[] }).messages.length > 0);

  // github.summarizePR(142)
  const ghPR = getTool("github.summarizePR")!;
  const ghResult = await exec(ghPR, { number: 142 }) as { item: { number: number } | null };
  check("github.summarizePR(#142) found",
        ghResult.item != null && ghResult.item.number === 142);

  // github.listPRs filter by state
  const ghList = getTool("github.listPRs")!;
  const ghListResult = await exec(ghList, { state: "ready_for_review" }) as { items: { state: string }[] };
  check("github.listPRs filters by state",
        ghListResult.items.length > 0 && ghListResult.items.every((p) => p.state === "ready_for_review"));

  // email.searchInbox for "SSO"
  const emailSearch = getTool("email.searchInbox")!;
  const emResult = await exec(emailSearch, { query: "SSO" }) as { emails: { subject: string }[] };
  check("email.searchInbox found SSO mail", emResult.emails.length > 0);

  // memory.recall — should hit multiple sources
  const mem = getTool("memory.recall")!;
  const memResult = await exec(mem, { query: "alpha", limit: 20 }) as { hits: { source: string }[] };
  const sources = new Set(memResult.hits.map((h) => h.source));
  check("memory.recall hits >=3 sources for 'alpha'",
        sources.size >= 3, `sources: ${[...sources].join(",")}`);

  // team.list filter
  const team = getTool("team.list")!;
  const tResult = await exec(team, { query: "Eng" }) as { people: { role?: string }[] };
  check("team.list filters by role substring",
        tResult.people.length > 0 && tResult.people.every((p) => /Eng/.test(p.role ?? "")));

  // calendar.createEvent (destructive but we still test the handler)
  const create = getTool("calendar.createEvent")!;
  const createResult = await exec(create, {
    title:     "Test event",
    start:     new Date().toISOString(),
    end:       new Date(Date.now() + 30 * 60_000).toISOString(),
    attendees: ["jane@openclaw.demo"],
  }) as { ok: boolean; event: { title: string } };
  check("calendar.createEvent returns ok",
        createResult.ok === true && createResult.event.title === "Test event");

  // respond is terminal — handler just echoes
  const respond = getTool("respond")!;
  const r = await exec(respond, { answer: "hello world" }) as { answer: string };
  check("respond echoes answer", r.answer === "hello world");
  check("respond riskLevel=terminal", respond.riskLevel === "terminal");

  console.log(process.exitCode ? "\n[smoke] FAIL" : "\n[smoke] PASS");
})().catch((err) => { console.error("[smoke] error:", err); process.exit(2); });
