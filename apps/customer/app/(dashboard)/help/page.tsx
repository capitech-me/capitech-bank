import Link from "next/link";
import { LifeBuoy, Mail, ArrowUpRight } from "lucide-react";
import { SUPPORT_EMAIL } from "@capitech/lib";
import { HelpFaq } from "@/components/help-faq";

export default function HelpPage() {
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3006";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <LifeBuoy className="size-6 text-brand-400" /> Help center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers to the most common questions. Can&apos;t find what you need? Our team is one
          message away.
        </p>
      </div>

      <HelpFaq />

      <div className="flex flex-col gap-4 rounded-2xl border border-brand-500/30 bg-brand-600/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-brand-300">
            <Mail className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Contact support</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Still stuck? Email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-brand-400 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              and we&apos;ll reply within one business day.
            </p>
          </div>
        </div>
        <Link
          href={`${landingUrl}/contact`}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500"
        >
          Send a message
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
