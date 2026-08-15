import { formatRelativeTime, ROLE_LABELS } from "@capitech/lib";
import { Badge } from "@capitech/ui";
import { getStaff } from "@/lib/data";

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Staff & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">Back-office personnel and their access levels.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-navy-950">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.role === "super_admin" ? "destructive" : "info"}>
                      {ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] ?? s.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === "active" ? "success" : "neutral"}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(s.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
