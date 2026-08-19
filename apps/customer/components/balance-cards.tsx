import Link from "next/link";
import {
  ArrowLeftRight,
  Plus,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import { formatMoney } from "@capitech/lib";
import { cn } from "@capitech/ui";

interface BalanceCardsProps {
  totals: { currency: string; total: string }[];
  accountsCount: number;
}

export function BalanceCards({ totals, accountsCount }: BalanceCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {totals.map((t, i) => (
        <div
          key={t.currency}
          className={cn(
            "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg",
            i === 0
              ? "bg-gradient-to-br from-brand-700 to-navy-950"
              : i === 1
                ? "bg-gradient-to-br from-navy-800 to-navy-950"
                : "bg-gradient-to-br from-accent-600 to-navy-950"
          )}
        >
          <p className="text-sm text-white/70">{t.currency} balance</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formatMoney(t.total, t.currency)}</p>
          <p className="mt-1 text-xs text-white/50">
            {i === 0 ? "Total across accounts" : `${accountsCount} account${accountsCount > 1 ? "s" : ""}`}
          </p>
        </div>
      ))}
    </div>
  );
}

export function QuickActions() {
  const actions = [
    { href: "/transfers", label: "Transfer", icon: ArrowLeftRight },
    { href: "/accounts?open=1", label: "Top up", icon: Plus },
    { href: "/cards?create=1", label: "New card", icon: CreditCard },
    { href: "/deposits?open=1", label: "Open deposit", icon: PiggyBank },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-navy-100 shadow-sm transition-colors hover:border-brand-400/50 hover:bg-white/5"
        >
          <action.icon className="size-4 text-brand-400" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}
