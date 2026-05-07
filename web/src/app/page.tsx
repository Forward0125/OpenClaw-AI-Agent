import { Card } from "@/components/Card";

export default function Page() {
  return (
    <div className="space-y-6">
      <Card title="OpenClaw Agent Analytics &mdash; Overview">
        <div className="p-12 text-center text-sm text-muted">
          KPI strip + workflow trends + tool usage donut land here in step 11.
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Recent Activity Log">
          <div className="p-6 text-sm text-muted">Coming step 10</div>
        </Card>
        <Card title="Alerts & Requires Attention">
          <div className="p-6 text-sm text-muted">Coming step 11</div>
        </Card>
      </div>
    </div>
  );
}
