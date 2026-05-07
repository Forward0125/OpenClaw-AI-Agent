/**
 * The fictional team the demo is built around. All other fixtures
 * reference these emails so cross-source reasoning works (e.g. an
 * email from sarah@... can be tied to her Slack messages).
 */

import type { Person } from "./types";

export const TEAM: Person[] = [
  { id: "u_jane",   name: "Jane Doe",       email: "jane@openclaw.demo",   role: "CEO (you)" },
  { id: "u_sarah",  name: "Sarah Chen",     email: "sarah@openclaw.demo",  role: "Product Manager" },
  { id: "u_mike",   name: "Mike Park",      email: "mike@openclaw.demo",   role: "Eng Lead" },
  { id: "u_priya",  name: "Priya Patel",    email: "priya@openclaw.demo",  role: "Senior Engineer" },
  { id: "u_tom",    name: "Tom Reynolds",   email: "tom@openclaw.demo",    role: "Engineer" },
  { id: "u_estedam", name: "Estedam Origen", email: "estedam@openclaw.demo", role: "Design Lead" },
  { id: "u_alex",   name: "Alex Rivera",    email: "alex@openclaw.demo",   role: "Customer Success" },
];

export const ME = TEAM[0];

export function findPerson(query: string): Person | undefined {
  const q = query.toLowerCase();
  return TEAM.find(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q),
  );
}
