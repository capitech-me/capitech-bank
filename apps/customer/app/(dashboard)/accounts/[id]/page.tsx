import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Wallet } from "lucide-react";
import { formatMoney, formatIban, formatDate } from "@capitech/lib";
import { Badge, Button } from "@capitech/ui";
import { getAccount, getTransactions } from "@/lib/data";
import { TransactionsCard } from "@/components/transaction-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [account, transactions] = await Promise.all([getAccount(id), getTransactions(id)]);
  if (!account) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 text-muted-foreground">
        <Link href="/accounts">
          <ArrowLeft className="size-4" /> All accounts
        </Link>
      </Button>

      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-navy-950 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-brand-200" />
              <h1 className="text-lg font-semibold">{account.nickname ?? account.productName}</h1>
              <Badge variant="success" className="border-transparent bg-white/10 text-white">
                {account.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-brand-200">{account.productName} · {account.currency}</p>
            <p className="mt-4 text-4xl font-bold tracking-tight">
              {formatMoney(account.availableBalance, account.currency)}
            </p>
            <p className="mt-1 text-sm text-brand-200">
              Ledger {formatMoney(account.ledgerBalance, account.currency)}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="rounded-lg bg-white/5 px-4 py-2.5">
              <p className="text-xs text-brand-200">Account number</p>
              <p className="font-mono text-white">{account.accountNo}</p>
            </div>
            <div className="rounded-lg bg-white/5 px-4 py-2.5">
              <p className="text-xs text-brand-200">IBAN</p>
              <p className="flex items-center gap-2 font-mono text-white">
                <span className="hidden sm:inline">{formatIban(account.iban)}</span>
                <span className="sm:hidden">{account.iban}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(account.iban)}
                  className="text-brand-200 hover:text-white"
                  aria-label="Copy IBAN"
                >
                  <Copy className="size-3.5" />
                </button>
              </p>
            </div>
            <div className="rounded-lg bg-white/5 px-4 py-2.5">
              <p className="text-xs text-brand-200">BIC / SWIFT</p>
              <p className="font-mono text-white">{account.bic}</p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-xs text-brand-200">Opened {formatDate(account.openedAt)}</p>
      </div>

      <TransactionsCard transactions={transactions} />
    </div>
  );
}
