import { Code2, FileCode2, FlaskConical, Webhook } from "lucide-react";
import { Badge } from "@capitech/ui";

const DEVELOPER_FEATURES = [
  {
    icon: Code2,
    title: "Open API",
    description:
      "An ISO 20022-style REST API for accounts, transfers and webhooks. Clean, versioned endpoints let you build banking directly into your product.",
  },
  {
    icon: FileCode2,
    title: "API Documentation",
    description:
      "Interactive docs with scoped API keys and sandbox credentials, so your team can explore every endpoint before you go live.",
  },
  {
    icon: FlaskConical,
    title: "Sandbox",
    description:
      "A test environment with demo data to build and validate integrations safely — fully isolated from production and available 24/7.",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description:
      "Real-time event delivery with HMAC-signed payloads, so your systems always know when money moves — securely and at scale.",
  },
];

export function Developers() {
  return (
    <section id="developers" className="scroll-mt-20 border-y border-border bg-muted/40 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="info" className="mb-4">
            Developers
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Built for developers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ship banking features fast — integrate in hours with our API, docs,
            sandbox and webhooks, not weeks.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEVELOPER_FEATURES.map((feature) => (
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
