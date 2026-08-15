import {
  Globe2,
  CreditCard,
  ShieldCheck,
  Zap,
  BarChart3,
  Fingerprint,
} from "lucide-react";
import { Badge } from "@capitech/ui";

const FEATURES = [
  {
    icon: Globe2,
    title: "Multi-currency accounts",
    description:
      "Hold, send and receive in 30+ currencies with real IBANs. Convert instantly at competitive rates — no hidden spreads.",
  },
  {
    icon: CreditCard,
    title: "Virtual cards on demand",
    description:
      "Spin up a virtual card in seconds with custom limits, merchant controls and instant freeze. Ideal for subscriptions and online spend.",
  },
  {
    icon: Zap,
    title: "Instant payments",
    description:
      "Send money to other Capitech customers instantly, 24/7. External payments settle fast across supported rails.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade security",
    description:
      "Two-factor authentication, session monitoring, encrypted data and row-level database isolation keep your money and data safe.",
  },
  {
    icon: BarChart3,
    title: "Smart analytics",
    description:
      "Understand your spending with category insights, monthly statements and exportable reports in PDF and CSV.",
  },
  {
    icon: Fingerprint,
    title: "Compliant by design",
    description:
      "Built around international standards: ISO 4217 currencies, IBAN/ISO 13616, ISO 20022-style messaging and double-entry accounting.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-muted/40 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mb-4">
            Why Capitech
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Powerful features. Zero complexity.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We rebuilt the banking stack from the ground up so that everything just
            works — fast, secure and transparent.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-navy-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
