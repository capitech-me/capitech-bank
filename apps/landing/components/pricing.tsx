import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Badge, Button } from "@capitech/ui";

const PLANS = [
  {
    name: "Personal",
    tagline: "Everyday banking, free to start",
    monthly: "Free",
    features: [
      "Multi-currency account (3 currencies)",
      "1 virtual card included",
      "Instant P2P transfers",
      "Term deposits from 7 days",
      "Mobile & web banking",
    ],
    cta: "Open account",
    href: "/sign-up?type=retail",
    featured: false,
  },
  {
    name: "Business",
    tagline: "For founders and growing teams",
    monthly: "$9",
    period: "/month",
    features: [
      "Everything in Personal",
      "Unlimited currencies",
      "Team cards with limits",
      "Bulk & payroll payments",
      "Open API sandbox access",
      "Accounting exports",
    ],
    cta: "Start business banking",
    href: "/sign-up?type=corporate",
    featured: true,
  },
  {
    name: "Corporate",
    tagline: "Treasury-grade platform",
    monthly: "Custom",
    features: [
      "Everything in Business",
      "Maker–checker controls",
      "FX desk & priority rates",
      "Dedicated relationship manager",
      "Full Open API & webhooks",
      "Audit-ready reporting",
    ],
    cta: "Talk to sales",
    href: "/contact",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-muted/40 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="info" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No hidden fees. No minimum balances. Upgrade when your business grows.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.featured
                  ? "relative flex flex-col rounded-2xl border-2 border-brand-600 bg-card p-7 shadow-lg"
                  : "relative flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
              }
            >
              {plan.featured && (
                <Badge variant="info" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold text-navy-950">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-navy-950">{plan.monthly}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-navy-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" variant={plan.featured ? "default" : "outline"} className="mt-7 w-full">
                <Link href={plan.href}>
                  {plan.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
