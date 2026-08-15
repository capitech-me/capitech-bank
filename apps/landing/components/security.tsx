import { ShieldCheck, Lock, Fingerprint, Database, EyeOff, FileCheck2 } from "lucide-react";
import { Badge } from "@capitech/ui";

const SECURITY_ITEMS = [
  {
    icon: Fingerprint,
    title: "Two-factor authentication",
    description: "TOTP-based MFA for every account, enforced for staff and recommended for all customers.",
  },
  {
    icon: Lock,
    title: "Encryption everywhere",
    description: "Data encrypted in transit and at rest. Secrets and keys never touch the browser.",
  },
  {
    icon: Database,
    title: "Row-level isolation",
    description: "Every customer's data is isolated at the database level — no cross-tenant access, ever.",
  },
  {
    icon: EyeOff,
    title: "Card tokenisation",
    description: "Card details are tokenised; only the last four digits are ever stored or displayed.",
  },
  {
    icon: FileCheck2,
    title: "Audit-ready ledger",
    description: "Immutable double-entry accounting records every movement with a full audit trail.",
  },
  {
    icon: ShieldCheck,
    title: "24/7 monitoring",
    description: "Continuous transaction monitoring with maker–checker controls and anomaly alerts.",
  },
];

export function Security() {
  return (
    <section className="border-y border-border bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="info" className="mb-4">
              Security
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
              Your money is protected by design
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We built security into the architecture — not as an afterthought. Strong
              authentication, granular permissions, immutable records and continuous
              monitoring protect every account, every transaction.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {SECURITY_ITEMS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <item.icon className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-2xl border border-border bg-navy-950 p-8 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Security check passed</p>
                  <p className="text-xs text-navy-400">All systems operational</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { label: "MFA enforcement", value: "Enabled", status: "ok" },
                  { label: "Session monitoring", value: "Active", status: "ok" },
                  { label: "Ledger integrity", value: "Verified", status: "ok" },
                  { label: "Card tokenisation", value: "Active", status: "ok" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                    <span className="text-sm text-navy-300">{row.label}</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 font-mono text-xs text-navy-300">
                <p className="text-navy-400">// double-entry ledger — balance check</p>
                <p>DEBIT&nbsp;&nbsp;2000 (Customer Deposits)&nbsp;&nbsp;500.00</p>
                <p>CREDIT&nbsp;&nbsp;1000 (Nostro)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;500.00</p>
                <p className="mt-1 text-emerald-400">✓ debits = credits — entry posted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
