import {
  Code2,
  FileCode2,
  FlaskConical,
  Webhook,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Zap,
} from "lucide-react";
import { Badge, Button } from "@capitech/ui";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Cta } from "@/components/cta";

const SECTIONS = [
  {
    id: "open-api",
    icon: Code2,
    title: "Open API",
    description:
      "An ISO 20022-style REST API for accounts, transfers and webhooks. Clean, versioned endpoints let you build banking directly into your product.",
    points: [
      "RESTful, versioned endpoints for accounts, payments and balances",
      "ISO 20022-style message structures for interoperability",
      "Scoped API keys with expiry and revocation",
      "Bearer-token authentication over HTTPS",
    ],
  },
  {
    id: "api-docs",
    icon: FileCode2,
    title: "API documentation",
    description:
      "Interactive documentation with scoped API keys and sandbox credentials, so your team can explore every endpoint before you go live.",
    points: [
      "Reference docs for every endpoint, parameter and response",
      "Worked examples and copy-paste code snippets",
      "Error codes and rate-limit guidance",
      "Authentication and webhook-signature walkthroughs",
    ],
  },
  {
    id: "sandbox",
    icon: FlaskConical,
    title: "Sandbox",
    description:
      "A test environment with demo data to build and validate integrations safely — fully isolated from production and available 24/7.",
    points: [
      "Instant sandbox credentials with demo customers and accounts",
      "Simulated transfers, cards and crypto orders",
      "Safe, reversible environment for integration testing",
      "Mirror of production behaviour with zero real funds",
    ],
  },
  {
    id: "webhooks",
    icon: Webhook,
    title: "Webhooks",
    description:
      "Real-time event delivery with HMAC-signed payloads, so your systems always know when money moves — securely and at scale.",
    points: [
      "Event-driven notifications for payments, accounts and cards",
      "HMAC-SHA256 signed payloads for integrity verification",
      "Timestamped requests with replay protection",
      "Retry with backoff and per-endpoint delivery logs",
    ],
  },
];

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Bank-grade security" },
  { icon: KeyRound, label: "Scoped API keys" },
  { icon: Zap, label: "Real-time events" },
];

export default function DevelopersPage() {
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
              Developers
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Build banking,{" "}
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                not infrastructure
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-300">
              Integrate accounts, payments, cards and webhooks into your product in
              hours — not weeks. Explore our Open API, docs, sandbox and webhooks
              below.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl" className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500 sm:w-auto">
                <Link href="/sign-up?type=corporate">
                  Get API access
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {HIGHLIGHTS.map((h) => (
                <div key={h.label} className="flex items-center gap-2 text-sm text-navy-300">
                  <h.icon className="size-4 text-accent-400" />
                  {h.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sections */}
        <div className="bg-background py-16 lg:py-20">
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
            {SECTIONS.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10"
              >
                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                    <section.icon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
                        {section.title}
                      </h2>
                      <span className="text-sm font-medium text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {section.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        <Cta />
      </main>
      <Footer />
    </>
  );
}
