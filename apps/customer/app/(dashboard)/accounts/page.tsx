import Link from "next/link";
import { ArrowUpRight, Plus, Wallet } from "lucide-react";
import { formatMoney, maskIban } from "@capitech/lib";
import { Badge, Button } from "@capitech/ui";
import { getAccounts } from "@/lib/data";
import { OpenAccountDialog } from "@/components/open-account-dialog";

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">All your accounts across currencies.</p>
        </div>
        <OpenAccountDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((account) => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Wallet className="size-5" />
              </div>
              <Badge variant={account.status === "active" ? "success" : account.status === "frozen" ? "warning" : "neutral"}>
                {account.status}
              </Badge>
            </div>
            <h3 className="mt-4 font-semibold text-navy-950">
              {account.nickname ?? account.productName}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{account.productName} · {account.currency}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-navy-950">
              {formatMoney(account.availableBalance, account.currency)}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{maskIban(account.iban)}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
              View details <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Plus className="size-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold text-navy-950">No accounts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Open your first account to get started.</p>
          <Button asChild className="mt-5">
            <Link href="/accounts?open=1">Open an account</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
