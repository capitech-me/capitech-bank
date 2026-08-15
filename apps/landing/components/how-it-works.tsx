import { UserPlus, CreditCard, Send } from "lucide-react";
import { Badge } from "@capitech/ui";

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Open your account",
    description:
      "Sign up in minutes with your email and verify your identity. Personal and corporate onboarding supported.",
  },
  {
    icon: CreditCard,
    step: "02",
    title: "Fund & get your cards",
    description:
      "Top up via sandbox rails, create virtual cards instantly and start spending across the globe.",
  },
  {
    icon: Send,
    step: "03",
    title: "Bank without limits",
    description:
      "Transfer, convert, deposit and invest — everything in real time from any device, anywhere.",
  },
];

export function HowItWorks() {
  return (
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
            No branches, no paperwork, no waiting rooms. Just a clean, fast onboarding
            flow.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.step} className="relative rounded-2xl border border-white/10 bg-navy-900/60 p-6">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300">
                  <step.icon className="size-5" />
                </div>
                <span className="text-4xl font-bold text-white/10">{step.step}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-300">{step.description}</p>
              {i < STEPS.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-white/15 md:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
