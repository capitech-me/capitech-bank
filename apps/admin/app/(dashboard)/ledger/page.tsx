import { formatDateTime, formatMoney, humanize } from "@capitech/lib";
import { Badge } from "@capitech/ui";
import { getCoa, getJournals } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";

const CATEGORY_STYLES: Record<string, string> = {
  asset: "bg-emerald-50 text-emerald-700 border-emerald-200",
  liability: "bg-rose-50 text-rose-700 border-rose-200",
  equity: "bg-violet-50 text-violet-700 border-violet-200",
  income: "bg-sky-50 text-sky-700 border-sky-200",
  expense: "bg-amber-50 text-amber-700 border-amber-200",
};

export default async function LedgerPage() {
  const [coa, journals] = await Promise.all([getCoa(), getJournals()]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">General Ledger</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chart of accounts and journal entries — immutable double-entry records.
        </p>
      </div>

      {/* Chart of accounts */}
      <section>
        <h2 className="mb-3 font-semibold text-navy-950">Chart of accounts</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Normal side</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coa.map((row) => (
                  <tr key={row.code} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.code}</td>
                    <td className="px-4 py-2.5 font-medium text-navy-950">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={CATEGORY_STYLES[row.category]}>
                        {humanize(row.category)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{row.normalSide}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-navy-950">
                      {row.balance.startsWith("-") ? `(${formatMoney(row.balance.slice(1), row.currency)})` : formatMoney(row.balance, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Journal */}
      <section>
        <h2 className="mb-3 font-semibold text-navy-950">Journal entries</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Journal no.</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-navy-950">{j.journalNo}</td>
                    <td className="px-4 py-3 text-navy-950">{j.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.reference}</td>
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(j.entryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
