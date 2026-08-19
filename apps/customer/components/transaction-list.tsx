import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { formatMoney, formatRelativeTime, humanize, TX_STATUS_LABELS } from "@capitech/lib";
import { Badge, cn } from "@capitech/ui";
import type { TransactionVM } from "@/lib/data";

function statusVariant(status: string) {
  switch (status) {
    case "posted":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "rejected":
    case "failed":
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

export function TransactionList({ transactions }: { transactions: TransactionVM[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No transactions yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {transactions.slice(0, 8).map((tx) => {
        const isIn = tx.direction === "in";
        return (
          <li key={tx.id} className="flex items-center gap-4 py-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                isIn ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-navy-200"
              )}
            >
              {isIn ? <ArrowDownLeft className="size-4.5" /> : <ArrowUpRight className="size-4.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-100">{tx.counterparty}</p>
              <p className="truncate text-xs text-muted-foreground">
                {humanize(tx.txType)} · {formatRelativeTime(tx.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-semibold", isIn ? "text-emerald-400" : "text-navy-100")}>
                {isIn ? "+" : "−"}{formatMoney(tx.amount, tx.currency)}
              </p>
              <Badge variant={statusVariant(tx.status)} className="mt-1">
                {TX_STATUS_LABELS[tx.status] ?? humanize(tx.status)}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function TransactionsCard({ transactions, viewAllHref }: { transactions: TransactionVM[]; viewAllHref?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-white">Recent activity</h3>
        {viewAllHref && (
          <Link href={viewAllHref} prefetch={false} className="text-sm font-medium text-brand-400 hover:text-brand-300">
            View all
          </Link>
        )}
      </div>
      <TransactionList transactions={transactions} />
    </div>
  );
}
