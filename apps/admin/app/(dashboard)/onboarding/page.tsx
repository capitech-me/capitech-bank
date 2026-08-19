import { formatRelativeTime } from "@capitech/lib";
import { Button } from "@capitech/ui";
import { getKycQueue } from "@/lib/data";
import { RiskBadge, StatusBadge } from "@/components/status-badge";
import { ApproveKycButton } from "@/components/approve-kyc-button";

export default async function OnboardingPage() {
  const queue = await getKycQueue();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Onboarding & KYC</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and verify new customer applications.</p>
        </div>
        <Button variant="outline">Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queue.map((item) => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-100">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.customerNo}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{item.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.country}</td>
                  <td className="px-4 py-3"><RiskBadge score={item.riskScore} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(item.submittedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status="pending" /></td>
                  <td className="px-4 py-3 text-right">
                    <ApproveKycButton itemId={item.id} />
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Queue is clear — no pending applications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
