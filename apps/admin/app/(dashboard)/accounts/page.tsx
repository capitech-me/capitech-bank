import { formatDate, formatMoney } from "@capitech/lib";
import { Button } from "@capitech/ui";
import { getAccounts } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">All customer accounts across the bank.</p>
        </div>
        <Button variant="outline">Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-navy-100">{a.accountNo}</td>
                  <td className="px-4 py-3 font-medium text-navy-100">{a.owner}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.product}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.currency}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-100">{formatMoney(a.balance, a.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.frozen ? "frozen" : a.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
