import { formatDate } from "@capitech/lib";
import { Input } from "@capitech/ui";
import { getCustomers } from "@/lib/data";
import { RiskBadge, StatusBadge } from "@/components/status-badge";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search and manage all customer records.</p>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Search by name or customer number…" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">KYC</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-100">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.customerNo}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.kycStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.kycLevel} /></td>
                  <td className="px-4 py-3"><RiskBadge score={c.riskScore} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
