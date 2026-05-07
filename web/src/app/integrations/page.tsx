import { Card } from "@/components/Card";

export default function Page() {
  return (
    <Card title="Integrations">
      <div className="p-6 text-sm text-muted">
        Slack &middot; Calendar &middot; GitHub &middot; Email status &mdash; coming step 11.
        <br />Demo uses fixtures; production wiring (OAuth) lives behind the same tool interface.
      </div>
    </Card>
  );
}
