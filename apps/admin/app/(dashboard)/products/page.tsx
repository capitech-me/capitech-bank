import { formatMoney, formatPercent, humanize } from "@capitech/lib";
import { Badge } from "@capitech/ui";
import { getProducts } from "@/lib/data";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">Banking products available to customers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <Badge variant="info" className="font-mono">{p.code}</Badge>
              <Badge variant={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
            </div>
            <h3 className="mt-3 font-semibold text-navy-950">{p.name}</h3>
            <p className="mt-0.5 text-sm capitalize text-muted-foreground">
              {humanize(p.productType)} {p.currency ? `· ${p.currency}` : ""}
            </p>
            <div className="mt-4 space-y-1.5 text-sm">
              {p.interestRate && (
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Interest rate</span>
                  <span className="font-medium text-navy-950">{formatPercent(p.interestRate)}</span>
                </p>
              )}
              {p.monthlyFee !== null && p.monthlyFee !== undefined && (
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Monthly fee</span>
                  <span className="font-medium text-navy-950">
                    {Number(p.monthlyFee) === 0 ? "Free" : formatMoney(p.monthlyFee, p.currency ?? "USD")}
                  </span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
