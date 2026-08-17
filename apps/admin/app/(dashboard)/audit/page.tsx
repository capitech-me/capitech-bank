import { formatDateTime } from "@capitech/lib";
import { getAuditLog } from "@/lib/data";

export default async function AuditPage() {
  const logs = await getAuditLog();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Audit trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable record of every back-office action. Append-only.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-navy-950">{log.actor}</td>
                  <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.action}</code></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.entity} <span className="font-mono text-xs">{log.entityId}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.details}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
