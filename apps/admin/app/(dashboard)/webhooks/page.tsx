import { formatDateTime, formatRelativeTime, humanize } from "@capitech/lib";
import { Badge } from "@capitech/ui";
import { getApiUsage, getWebhookEndpoints, getWebhookEvents } from "@/lib/data";

const ACTIVE_STYLES: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  paused: "border-white/10 bg-white/5 text-navy-200",
};

const DELIVERY_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  delivered: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  failed: "border-rose-500/30 bg-rose-500/15 text-rose-300",
};

function statusCodeStyles(statusCode: number | null) {
  if (statusCode === null) return "border-white/10 bg-white/5 text-navy-200";
  if (statusCode < 300) return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (statusCode < 500) return "border-amber-500/30 bg-amber-500/15 text-amber-300";
  return "border-rose-500/30 bg-rose-500/15 text-rose-300";
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-semibold text-white">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export default async function WebhooksPage() {
  const [endpoints, events, usage] = await Promise.all([
    getWebhookEndpoints(),
    getWebhookEvents(),
    getApiUsage(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Webhook Delivery Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered webhook endpoints, delivery attempts and API usage for this tenant.
        </p>
      </div>

      {/* Webhook endpoints */}
      <section>
        <SectionHeading title="Webhook endpoints" description="Endpoints registered via the Open API." />
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Events</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {endpoints.map((endpoint) => (
                  <tr key={endpoint.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-navy-100">{endpoint.url}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {endpoint.events.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          endpoint.events.map((ev) => (
                            <Badge key={ev} variant="outline" className="border-white/10 bg-white/5 font-mono text-navy-200">
                              {ev}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={ACTIVE_STYLES[endpoint.active ? "active" : "paused"]}>
                        {endpoint.active ? "active" : "paused"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(endpoint.createdAt)}</td>
                  </tr>
                ))}
                {endpoints.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      No webhook endpoints. Register one via the Open API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Delivery log */}
      <section>
        <SectionHeading title="Delivery log" description="Latest webhook deliveries and their delivery status." />
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-navy-100">{event.eventType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {event.endpointId ? event.endpointId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={DELIVERY_STYLES[event.status]}>
                        {humanize(event.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-navy-100">{event.attempts}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(event.createdAt)}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No webhook events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* API usage */}
      <section>
        <SectionHeading title="API usage" description="Last 20 Open API calls recorded for this tenant." />
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Latency</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usage.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-navy-100">{row.endpoint}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="border-brand-500/30 bg-brand-600/20 font-mono text-brand-200">
                        {row.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="outline" className={statusCodeStyles(row.statusCode)}>
                        {row.statusCode ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-navy-100">
                      {row.latencyMs !== null ? `${row.latencyMs} ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))}
                {usage.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No API usage recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
