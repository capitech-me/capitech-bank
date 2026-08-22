import Link from "next/link";
import { ArrowRight, ShieldCheck, Globe2, Zap } from "lucide-react";
import { Button } from "@capitech/ui";

const STATS = [
  { value: "190+", label: "Countries served" },
  { value: "30+", label: "Currencies" },
  { value: "24/7", label: "Support & monitoring" },
  { value: "ISO", label: "Standard-aligned" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      {/* decorative gradients */}
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

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-navy-200">
              <ShieldCheck className="size-4 text-accent-400" />
              Regulated-grade security. Built for the digital era.
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Banking beyond{" "}
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                borders
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-navy-300 lg:mx-0">
              One digital bank for everything — multi-currency accounts, virtual cards,
              term deposits, crypto and open APIs. Personal and business banking that
              moves as fast as you do.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="xl" className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500 sm:w-auto">
                <Link href="/sign-up">
                  Open your account
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="w-full border-white/15 bg-transparent text-white hover:bg-white/5 sm:w-auto"
              >
                <Link href="#products">Explore services</Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="w-full border-accent-500/40 bg-accent-500/10 text-accent-300 hover:bg-accent-500/20 sm:w-auto"
              >
                <Link href="/sign-in?demo=1">Try demo</Link>
              </Button>
            </div>

            <p className="mt-5 text-sm text-navy-400">
              Free to open · No monthly fees on standard plans · 2-minute onboarding
            </p>
          </div>

          {/* Product mockup */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-brand-600/30 to-accent-500/20 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-2xl border border-white/10 bg-navy-900/80 p-5 shadow-2xl backdrop-blur">
              {/* card */}
              <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold tracking-wide">Capitech Card</span>
                  <span className="text-xs text-brand-200">VISA</span>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} className="h-3 w-3 rounded-full bg-white/25" />
                    ))}
                    <span className="text-sm tracking-widest">4242</span>
                  </div>
                  <span className="text-xs text-brand-200">08/30</span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-xs text-navy-400">Total balance</p>
                    <p className="text-xl font-semibold text-white">$24,580.42</p>
                  </div>
                  <Globe2 className="size-5 text-accent-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/5 px-4 py-3">
                    <p className="text-xs text-navy-400">EUR</p>
                    <p className="text-sm font-semibold text-white">€12,340.00</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-4 py-3">
                    <p className="text-xs text-navy-400">GBP</p>
                    <p className="text-sm font-semibold text-white">£8,120.50</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-amber-400" />
                    <p className="text-sm text-navy-200">Instant transfer</p>
                  </div>
                  <p className="text-sm font-medium text-emerald-400">+$350.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-white/10 pt-10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-navy-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
