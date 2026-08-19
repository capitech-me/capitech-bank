import { formatRelativeTime, formatMoney, humanize } from "@capitech/lib";
import { getApprovals } from "@/lib/data";
import { ApprovePaymentButton } from "@/components/approve-payment-button";

export default async function PaymentsPage() {
  const approvals = await getApprovals();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Payment approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maker–checker queue — review and authorise payment orders before execution.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approvals.map((a) => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-medium text-navy-100">{a.orderNo}</p>
                    <p className="text-xs text-muted-foreground">by {a.requestedBy}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{humanize(a.txType)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-100">{formatMoney(a.amount, a.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.fromAccount.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.toAccount.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(a.requestedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <ApprovePaymentButton orderId={a.id} />
                  </td>
                </tr>
              ))}
              {approvals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No pending approvals — all caught up.
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
