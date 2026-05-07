"use client";

/**
 * Integrations page — shows the 5 fixture-backed sources as if they
 * were real OAuth integrations. The "Connect" button is intentionally
 * disabled with a "demo mode" note: production wiring is the same
 * shape, but this public site stays browser-only.
 */

import {
  Calendar as CalIcon,
  CircleCheck,
  GitPullRequest,
  Hash,
  Mail,
  MessageSquare,
  Plug,
} from "lucide-react";
import { Card } from "@/components/Card";
import { FIXTURE_COUNTS } from "@/lib/fixtures";
import { cn } from "@/lib/cn";

interface Integration {
  id:           string;
  name:         string;
  icon:         React.ComponentType<{ className?: string }>;
  description:  string;
  count:        number;
  productName:  string;
  brandColor:   string;
}

const INTEGRATIONS: Integration[] = [
  { id: "slack",    name: "Slack",       icon: Hash,            description: "Channels, threads, mentions",   count: FIXTURE_COUNTS.slack,    productName: "Slack",         brandColor: "bg-warn/15  text-warn" },
  { id: "calendar", name: "Calendar",    icon: CalIcon,         description: "Events, availability, invites", count: FIXTURE_COUNTS.calendar, productName: "Google Calendar",brandColor: "bg-info/15  text-info" },
  { id: "github",   name: "GitHub",      icon: GitPullRequest,  description: "PRs, issues, repos",            count: FIXTURE_COUNTS.github,   productName: "GitHub",        brandColor: "bg-accent/15 text-accent" },
  { id: "email",    name: "Email",       icon: Mail,            description: "Inbox, drafts, replies",        count: FIXTURE_COUNTS.email,    productName: "Gmail",         brandColor: "bg-ok/15    text-ok" },
  { id: "sms",      name: "SMS",         icon: MessageSquare,   description: "Inbound + outbound messages",    count: FIXTURE_COUNTS.sms,      productName: "Twilio",        brandColor: "bg-elevated text-muted" },
];

export default function Page() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <Plug className="size-3.5 text-accent" />
            Integrations
          </span>
        }
      >
        <div className="p-4 text-sm text-muted">
          OpenClaw connects to 5 surfaces in production via OAuth. This public
          demo backs each surface with fixtures so anyone can run the
          orchestrator without an OAuth signup. The agent tools (
          <code className="text-fg">lib/tools.ts</code>) read the same shapes
          either way &mdash; swapping a real adapter in is a one-file change.
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => <IntegrationCard key={i.id} info={i} />)}
      </div>
    </div>
  );
}

function IntegrationCard({ info }: { info: Integration }) {
  const Icon = info.icon;
  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className={cn("inline-flex items-center justify-center size-9 rounded", info.brandColor)}>
            <Icon className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-fg">{info.name}</h3>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-ok bg-ok/15 px-1.5 py-0.5 rounded">
                <CircleCheck className="size-3" />
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">{info.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Records" value={String(info.count)} />
          <Stat label="Provider" value={info.productName} />
        </div>

        <div className="pt-2 border-t border-line/40 flex items-center justify-between text-[11px]">
          <span className="text-dim">Demo mode &middot; fixture-backed</span>
          <button
            type="button"
            disabled
            className="text-muted opacity-50 cursor-not-allowed"
            title="OAuth connection only available in production builds."
          >
            Connect via OAuth
          </button>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-elevated/40 border border-line/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-dim">{label}</div>
      <div className="text-fg font-mono tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
