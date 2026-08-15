import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@capitech/ui";

export function Cta() {
  return (
    <section className="bg-background pb-20 lg:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-navy-950 px-6 py-16 text-center shadow-xl sm:px-12 lg:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to bank beyond borders?
            </h2>
            <p className="mt-4 text-lg text-brand-100">
              Join thousands of customers and businesses banking smarter with Capitech.
              Open your account in minutes — free.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl" className="w-full bg-white text-brand-700 hover:bg-brand-50 sm:w-auto">
                <Link href="/sign-up">
                  Open your account
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 sm:w-auto"
              >
                <Link href="/contact">Talk to our team</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
