/**
 * All fixture timestamps are computed at module-load time as relative
 * offsets from "now", so the demo never feels stale — yesterday's
 * standup is always actually yesterday no matter when the recruiter
 * lands on the site.
 */

const MS_MIN  = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY  = 24 * MS_HOUR;

let frozen: number | null = null;

/** Override "now" for deterministic tests / SSR. */
export function freezeNow(ms: number): void { frozen = ms; }
export function unfreezeNow():       void { frozen = null; }

function now(): number { return frozen ?? Date.now(); }

export function daysAgo(d: number, hourOfDay = 9): string {
  const t = new Date(now() - d * MS_DAY);
  t.setHours(hourOfDay, 0, 0, 0);
  return t.toISOString();
}

export function hoursAgo(h: number): string {
  return new Date(now() - h * MS_HOUR).toISOString();
}

export function minutesAgo(m: number): string {
  return new Date(now() - m * MS_MIN).toISOString();
}

export function daysFromNow(d: number, hourOfDay = 10): string {
  const t = new Date(now() + d * MS_DAY);
  t.setHours(hourOfDay, 0, 0, 0);
  return t.toISOString();
}

export function hoursFromNow(h: number): string {
  return new Date(now() + h * MS_HOUR).toISOString();
}

/** Add minutes to an ISO date — used to compute event end times. */
export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MS_MIN).toISOString();
}
