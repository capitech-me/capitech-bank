import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  Landmark,
  ArrowLeftRight,
  CreditCard,
  Coins,
  PiggyBank,
  UserPlus,
  BadgeCheck,
  Send,
} from "lucide-react";
import { Badge, Button } from "@capitech/ui";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Cta } from "@/components/cta";

const OFFERINGS = [
  {
    icon: Globe2,
    title: "Multi-currency accounts",
    description:
      "Hold, send and receive 30+ currencies with real IBANs. Convert instantly at competitive rates with no hidden spreads.",
  },
  {
    icon: Landmark,
    title: "Virtual IBANs",
    description:
      "Get dedicated IBANs for receiving international payments. Fully ISO 13616 compliant and ready for cross-border business.",
  },
  {
    icon: ArrowLeftRight,
    title: "Instant transfers",
    description:
      "Move money to other Capitech customers instantly, 24/7. Maker-checker approvals add an extra layer of security on every transfer.",
  },
  {
    icon: CreditCard,
    title: "Virtual & physical cards",
    description:
      "Issue virtual cards instantly and order physical cards to spend anywhere. Set per-card limits and freeze any card with one tap.",
  },
  {
    icon: Coins,
    title: "Crypto",
    description:
      "Buy, sell and hold digital assets straight from your account. Custodial wallets and live prices keep everything in one place.",
  },
  {
    icon: PiggyBank,
    title: "Term deposits",
    description:
      "Grow your savings with fixed-term deposits at competitive rates. Auto-rollover keeps your money working for you.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Open account",
    description:
      "Sign up in minutes with your email and choose a personal account. No branches, no paperwork.",
  },
  {
    icon: BadgeCheck,
    step: "02",
    title: "Verify identity",
    description:
      "Complete KYC verification securely with your ID. Most approvals are instant, with bank-grade checks.",
  },
  {
    icon: Send,
    step: "03",
    title: "Start banking",
    description:
      "Fund your account, create cards and start sending, spending and saving across currencies.",
  },
];

export default function PersonalPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-950">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-accent-500/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
            <Badge variant="neutral" className="mb-6 border-white/10 bg-white/10 text-navy-100">
              Personal Banking
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Everyday banking,{" "}
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                without borders
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-300">
              One personal account for everything — multi-currency balances, virtual
              cards, instant transfers, crypto and savings. Bank the way your life
              moves.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl" className="w-full sm:w-auto">
                <Link href="/sign-up?type=retail">
                  Open a personal account
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-navy-400">
              Free to open · No monthly fees on the standard plan · 2-minute onboarding
            </p>
          </div>
        </section>

        {/* Offerings */}
        <section id="offerings" className="scroll-mt-20 bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="info" className="mb-4">
                What you get
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
                Everything you need, in one account
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From daily spending to long-term savings — every tool is built in,
                secure and ready from day one.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {OFFERINGS.map((offering) => (
                <div
                  key={offering.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                    <offering.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-navy-950">{offering.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {offering.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-navy-950 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="neutral" className="mb-4 border-white/10 bg-white/10 text-navy-100">
                How it works
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Banking live in minutes
              </h2>
              <p className="mt-4 text-lg text-navy-300">
                No branches, no paperwork, no waiting rooms. Just a clean, fast
                onboarding flow.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div
                  key={step.step}
                  className="relative rounded-2xl border border-white/10 bg-navy-900/60 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300">
                      <step.icon className="size-5" />
                    </div>
                    <span className="text-4xl font-bold text-white/10">{step.step}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-300">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <div
                      className="absolute -right-3 top-1/2 hidden h-px w-6 bg-white/15 md:block"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Cta />
      </main>
      <Footer />
    </>
  );
}
