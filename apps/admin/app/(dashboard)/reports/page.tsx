import { formatMoney, humanize } from "@capitech/lib";
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from "@capitech/ui";
import { CheckCircle2, Scale, TrendingUp, XCircle } from "lucide-react";
import { getBalanceSheet, getProfitAndLoss, type ReportSection } from "@/lib/data";

const CATEGORY_STYLES: Record<string, string> = {
  asset: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  liability: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  equity: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  income: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  expense: "border-amber-500/30 bg-amber-500/15 text-amber-300",
};

function formatAmount(amount: number, currency: string) {
  return amount < 0 ? `(${formatMoney(Math.abs(amount), currency)})` : formatMoney(amount, currency);
}

function TotalsCell({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals);
  if (entries.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <>
      {entries.map(([currency, total]) => (
        <span key={currency} className="block">
          {formatAmount(total, currency)}
        </span>
      ))}
    </>
  );
}

function SectionTable({ section }: { section: ReportSection }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-white">{section.label}</h3>
        <Badge variant="outline" className={CATEGORY_STYLES[section.category]}>
          {humanize(section.category)}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Currency</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {section.lines.map((line) => (
              <tr key={`${line.code}-${line.currency}`} className="hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{line.code}</td>
                <td className="px-4 py-2.5 font-medium text-navy-100">{line.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{line.currency}</td>
                <td className="px-4 py-2.5 text-right font-mono text-navy-100">
                  {formatAmount(line.balance, line.currency)}
                </td>
              </tr>
            ))}
            {section.lines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  No accounts in this category.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-white/5">
              <td
                colSpan={3}
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Total {section.label}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-navy-100">
                <TotalsCell totals={section.totals} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  const [balanceSheet, pnl] = await Promise.all([getBalanceSheet(), getProfitAndLoss()]);
  const balanceCurrencies = Object.keys(balanceSheet.totalsByCurrency);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Balance sheet and profit &amp; loss, drawn from the general ledger.
        </p>
      </div>

      <Tabs defaultValue="balance-sheet">
        <TabsList>
          <TabsTrigger value="balance-sheet">
            <Scale className="size-4" /> Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="profit-loss">
            <TrendingUp className="size-4" /> Profit &amp; Loss
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-white">Balance sheet</h2>
                <p className="text-xs text-muted-foreground">
                  Assets must equal liabilities plus equity for every currency.
                </p>
              </div>
              {balanceSheet.hasBalances ? (
                balanceSheet.balanced ? (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" /> Balanced
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="size-3" /> Out of balance
                  </Badge>
                )
              ) : (
                <Badge variant="neutral">No balances yet</Badge>
              )}
            </div>

            {balanceCurrencies.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {balanceCurrencies.map((currency) => {
                  const t = balanceSheet.totalsByCurrency[currency];
                  const ok = Math.abs(t.assets - (t.liabilities + t.equity)) <= 0.005;
                  return (
                    <div key={currency} className="rounded-xl border border-border bg-navy-950/60 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {currency}
                        </p>
                        <span className={`size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                      </div>
                      <dl className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Assets</dt>
                          <dd className="font-mono text-navy-100">{formatAmount(t.assets, currency)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Liabilities</dt>
                          <dd className="font-mono text-navy-100">{formatAmount(t.liabilities, currency)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Equity</dt>
                          <dd className="font-mono text-navy-100">{formatAmount(t.equity, currency)}</dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <SectionTable section={balanceSheet.assets} />
          <SectionTable section={balanceSheet.liabilities} />
          <SectionTable section={balanceSheet.equity} />
        </TabsContent>

        <TabsContent value="profit-loss" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-white">Profit &amp; loss</h2>
            <p className="text-xs text-muted-foreground">
              Net income = income − expenses for the period to date.
            </p>
            {Object.keys(pnl.totalsByCurrency).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No income or expense activity yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(pnl.totalsByCurrency).map(([currency, t]) => (
                  <div key={currency} className="rounded-xl border border-border bg-navy-950/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {currency}
                    </p>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Income</dt>
                        <dd className="font-mono text-emerald-300">{formatAmount(t.income, currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Expenses</dt>
                        <dd className="font-mono text-amber-300">{formatAmount(t.expenses, currency)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1">
                        <dt className="font-medium text-navy-100">Net</dt>
                        <dd className={`font-mono ${t.net < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                          {formatAmount(t.net, currency)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SectionTable section={pnl.income} />
          <SectionTable section={pnl.expenses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
