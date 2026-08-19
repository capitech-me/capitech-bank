import Link from "next/link";
import {
  User,
  Building2,
  Coins,
  CreditCard,
  PiggyBank,
  Code2,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@capitech/ui";

const PRODUCTS = [
  {
    id: "personal",
    href: "/personal",
    icon: User,
    badge: "Most popular",
    title: "Personal Banking",
    description:
      "Everyday accounts with multi-currency support, instant transfers, virtual cards and savings tools — all in one app.",
    features: ["Multi-currency current account", "Virtual & physical cards", "Instant P2P transfers", "Personal savings & deposits"],
  },
  {
    id: "business",
    href: "/business",
    icon: Building2,
    title: "Business Banking",
    description:
      "Banking built for founders and SMEs: separate accounts, expense control, team cards and API access from day one.",
    features: ["Business accounts & IBANs", "Team cards with limits", "Payroll & bulk payments", "Open API sandbox access"],
  },
  {
    href: "/sign-up?type=retail",
    icon: Coins,
    title: "Crypto",
    badge: "Coming soon",
    description:
      "Buy, sell and hold digital assets directly from your bank account with custodial wallets and live market prices.",
    features: ["Custodial crypto wallets", "Live market prices", "Instant conversion to fiat", "Bank-grade custody"],
  },
  {
    href: "/sign-up?type=retail",
    icon: CreditCard,
    title: "Virtual Cards",
    description:
      "Create unlimited virtual cards in seconds. Set limits, freeze instantly, and pay online with total control.",
    features: ["Instant issuance", "Per-card limits & controls", "Freeze / unfreeze anytime", "Works everywhere online"],
  },
  {
    href: "/sign-up?type=retail",
    icon: PiggyBank,
    title: "Term Deposits",
    description:
      "Grow your savings with flexible fixed-term deposits and competitive rates across major currencies.",
    features: ["Flexible terms from 7 days", "Competitive fixed rates", "Auto-rollover option", "Interest at maturity"],
  },
  {
    href: "/sign-up?type=corporate",
    icon: Code2,
    title: "Open API",
    badge: "Developer",
    description:
      "Integrate banking into your product. RESTful APIs, webhooks and sandbox environment built on ISO 20022-style messaging.",
    features: ["REST API & webhooks", "Sandbox environment", "ISO 20022-style messages", "API keys with scopes"],
  },
];

export function Products() {
  return (
    <section id="products" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="info" className="mb-4">
            Products
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Everything a modern bank should be
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From everyday personal banking to business and developer tools — one
            platform, every service, no legacy.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((product) => (
            <Link
              key={product.title}
              href={product.href}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
            >
              {product.badge && (
                <Badge
                  variant={product.badge === "Coming soon" ? "secondary" : "info"}
                  className="absolute right-5 top-5"
                >
                  {product.badge}
                </Badge>
              )}
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <product.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy-950">{product.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              <ul className="mt-4 space-y-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-navy-700">
                    <span className="size-1.5 rounded-full bg-accent-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 group-hover:gap-2.5 transition-all">
                Learn more <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
