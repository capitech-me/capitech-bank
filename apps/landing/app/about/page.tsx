import {
  Target,
  ShieldCheck,
  Globe2,
  HeartHandshake,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge, Button } from "@capitech/ui";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Cta } from "@/components/cta";

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Security first",
    description:
      "Bank-grade encryption, strong customer authentication and a double-entry ledger at the core of everything we build.",
  },
  {
    icon: Globe2,
    title: "Borderless by design",
    description:
      "30+ currencies, real IBANs and ISO-aligned standards so money moves as freely as you do.",
  },
  {
    icon: Sparkles,
    title: "Radical simplicity",
    description:
      "Powerful banking, zero complexity. Clean interfaces, fast onboarding and no hidden fees.",
  },
  {
    icon: HeartHandshake,
    title: "Customer obsessed",
    description:
      "We build for individuals and businesses alike — from everyday spenders to fast-growing teams.",
  },
];

const STATS = [
  { value: "190+", label: "Countries supported" },
  { value: "30+", label: "Currencies" },
  { value: "24/7", label: "Always-on service" },
  { value: "ISO", label: "Standard-aligned" },
];

export default function AboutPage() {
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
              About Capitech
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Banking,{" "}
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                reimagined
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-300">
              Capitech Bank is a full-fledged digital banking platform built from the
              ground up for a world that moves across borders, currencies and time
              zones — with the security of a traditional bank and the speed of modern
              software.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl" className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500 sm:w-auto">
                <Link href="/sign-up">
                  Open your account
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                <Target className="size-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
                Our mission
              </h2>
            </div>
            <p className="mx-auto mt-6 text-center text-lg leading-relaxed text-muted-foreground">
              We believe everyone — individuals and businesses alike — deserves access
              to modern, transparent and secure financial services, wherever they are.
              So we rebuilt the banking stack around international standards, a
              double-entry ledger and a clean, human-centred experience.
            </p>
            <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
                >
                  <p className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-y border-border bg-muted/40 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="success" className="mb-4">
                What we stand for
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
                Values that guide us
              </h2>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                    <value.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-navy-950">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
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
