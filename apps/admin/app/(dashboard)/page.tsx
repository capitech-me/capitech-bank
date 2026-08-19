import { Users, ClipboardCheck, Wallet, Activity } from "lucide-react";
import { Card, CardContent, cn } from "@capitech/ui";
import { formatMoney, humanize } from "@capitech/lib";
import { getKycQueue, getCustomers, getAccounts, getApprovals } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";

export default async function OverviewPage() {
  const [kycQueue, customers, accounts, approvals] = await Promise.all([
    getKycQueue(),
    getCustomers(),
    getAccounts(),
    getApprovals(),
  ]);

  const approvedCustomers = customers.filter((c) => c.kycStatus === "approved").length;

  const stats = [
    { label: "Total customers", value: customers.length, sub: `${approvedCustomers} fully approved`, icon: Users, tone: "bg-brand-600/20 text-brand-300" },
    { label: "Pending KYC", value: kycQueue.length, sub: "Awaiting review", icon: ClipboardCheck, tone: "bg-amber-500/15 text-amber-300" },
    { label: "Accounts", value: accounts.length, sub: `${accounts.filter((a) => a.frozen).length} frozen`, icon: Wallet, tone: "bg-emerald-500/15 text-emerald-300" },
    { label: "Pending approvals", value: approvals.length, sub: "Payment orders", icon: Activity, tone: "bg-sky-500/15 text-sky-300" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Operations overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live snapshot of the bank — updated in real time.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-start gap-4">
              <div className={cn("flex size-11 items-center justify-center rounded-xl", stat.tone)}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight text-white">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold text-white">Recent KYC applications</h3>
            <ul className="divide-y divide-border">
              {kycQueue.slice(0, 5).map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-navy-100">{k.name}</p>
                    <p className="text-xs text-muted-foreground">{k.customerNo} · {k.country}</p>
                  </div>
                  <StatusBadge status="pending" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold text-white">Payment approvals</h3>
            <ul className="divide-y divide-border">
              {approvals.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-navy-100">{a.orderNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(a.amount, a.currency)} · {humanize(a.txType)}
                    </p>
                  </div>
                  <StatusBadge status="pending" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
