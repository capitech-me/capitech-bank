import Link from "next/link";
import { CreditCard, PiggyBank, Wallet } from "lucide-react";
import { formatMoney, formatPercent, formatDate, maskCard } from "@capitech/lib";
import { Badge } from "@capitech/ui";
import { BalanceCards, QuickActions } from "@/components/balance-cards";
import { TransactionsCard } from "@/components/transaction-list";
import { getAccounts, getCards, getDeposits, getNotifications, getTotalByCurrency, getTransactions } from "@/lib/data";

export default async function DashboardPage() {
  const [accounts, transactions, cards, deposits, notifications] = await Promise.all([
    getAccounts(),
    getTransactions(),
    getCards(),
    getDeposits(),
    getNotifications(),
  ]);

  const totals = getTotalByCurrency(accounts);
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Your money at a glance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length} account{accounts.length > 1 ? "s" : ""} · balances updated live
          </p>
        </div>
        <QuickActions />
      </div>

      <BalanceCards totals={totals} accountsCount={accounts.length} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionsCard transactions={transactions} viewAllHref="/accounts" />
        </div>

        <div className="space-y-6">
          {/* Cards summary */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <CreditCard className="size-4 text-brand-400" /> Cards
              </h3>
              <Link href="/cards" prefetch={false} className="text-sm font-medium text-brand-400 hover:text-brand-300">
                Manage
              </Link>
            </div>
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cards yet.</p>
            ) : (
              <div className="space-y-3">
                {cards.slice(0, 2).map((card) => (
                  <div key={card.id} className="flex items-center justify-between rounded-xl bg-navy-950 px-4 py-3 text-white">
                    <div>
                      <p className="font-mono text-sm tracking-wider">{maskCard(`424242424242${card.last4}`)}</p>
                      <p className="mt-0.5 text-xs text-navy-400">{formatDate(new Date(card.expYear, card.expMonth, 1))}</p>
                    </div>
                    <Badge variant={card.frozen ? "neutral" : "success"} className="border-transparent bg-white/10 text-white">
                      {card.frozen ? "Frozen" : "Active"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deposits summary */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <PiggyBank className="size-4 text-accent-400" /> Term deposits
              </h3>
              <Link href="/deposits" prefetch={false} className="text-sm font-medium text-brand-400 hover:text-brand-300">
                View
              </Link>
            </div>
            {deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deposits.</p>
            ) : (
              <div className="space-y-3">
                {deposits.slice(0, 2).map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-navy-100">{formatMoney(dep.principal, dep.currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(dep.interestRate)} · {dep.termDays}d
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Matures {formatDate(dep.maturityDate)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications preview */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Wallet className="size-4 text-brand-400" /> Updates
              </h3>
              <Link href="/notifications" prefetch={false} className="text-sm font-medium text-brand-400 hover:text-brand-300">
                All
              </Link>
            </div>
            {unread.length === 0 ? (
              <p className="text-sm text-muted-foreground">You are all caught up.</p>
            ) : (
              <ul className="space-y-3">
                {unread.slice(0, 3).map((n) => (
                  <li key={n.id} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-sm font-medium text-navy-100">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
