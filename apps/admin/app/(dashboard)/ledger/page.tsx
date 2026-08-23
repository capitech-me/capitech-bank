import { formatDateTime, formatMoney, humanize } from "@capitech/lib";
import { Badge } from "@capitech/ui";
import { getCoa, getJournals } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";

const CATEGORY_STYLES: Record<string, string> = {
  asset: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  liability: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  equity: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  income: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  expense: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export default async function LedgerPage() {
  const [coa, journals] = await Promise.all([getCoa(), getJournals()]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">General Ledger</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chart of accounts and journal entries — immutable double-entry records.
        </p>
      </div>

      {/* Chart of accounts */}
      <section>
        <h2 className="mb-3 font-semibold text-white">Chart of accounts</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Normal side</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coa.map((row) => (
                  <tr key={row.code} className="hover:bg-white/5">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.code}</td>
                    <td className="px-4 py-2.5 font-medium text-navy-100">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={CATEGORY_STYLES[row.category]}>
                        {humanize(row.category)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{row.normalSide}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-navy-100">
                      {row.balance.startsWith("-") ? `(${formatMoney(row.balance.slice(1), row.currency)})` : formatMoney(row.balance, row.currency)}
                    </td>
                  </tr>
                ))}
                {coa.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No chart of accounts entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Journal */}
      <section>
        <h2 className="mb-3 font-semibold text-white">Journal entries</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Journal no.</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-navy-100">{j.journalNo}</td>
                    <td className="px-4 py-3 text-navy-100">{j.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.reference}</td>
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(j.entryDate)}</td>
                  </tr>
                ))}
                {journals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No journal entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
