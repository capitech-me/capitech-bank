"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@capitech/ui";
import { cn } from "@capitech/ui";

const FAQS = [
  {
    q: "How long does it take to open an account?",
    a: "Personal accounts are usually opened in under 10 minutes. Corporate onboarding takes a bit longer because of the additional KYC documentation we review — typically 1 to 2 business days.",
  },
  {
    q: "Which countries and currencies are supported?",
    a: "Capitech supports customers in 190+ countries and accounts in 30+ currencies (ISO 4217). Multi-currency accounts let you hold, send and receive in several currencies simultaneously.",
  },
  {
    q: "What are virtual cards and how do they work?",
    a: "A virtual card is a digital payment card with its own number, linked to your account. You can create one instantly, set daily and monthly limits, restrict merchants, and freeze it at any time — perfect for online spending and subscriptions.",
  },
  {
    q: "Is my money protected?",
    a: "Yes. We apply bank-grade security: two-factor authentication, encryption in transit and at rest, tokenised card data, and database-level isolation between customers. All transactions are recorded on an immutable double-entry ledger.",
  },
  {
    q: "How do term deposits work?",
    a: "Choose an amount, a term (from 7 days) and a currency. Your money earns a fixed interest rate for the term and is returned with interest at maturity. You can opt for automatic rollover.",
  },
  {
    q: "Does Capitech support crypto?",
    a: "Yes — custodial crypto wallets with live market prices are part of our roadmap. You will be able to buy, sell and hold digital assets directly from your Capitech account.",
  },
  {
    q: "Can businesses integrate with the Open API?",
    a: "Absolutely. Business and Corporate clients get access to our REST API, webhooks and a sandbox environment. Endpoints follow ISO 20022-style message semantics and are secured with scoped API keys.",
  },
  {
    q: "How do I close my account?",
    a: "You can close your account anytime from Settings, or by contacting support@capitech.me. Remaining balances are returned to your linked account before closure.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="info" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.q}
                className={cn(
                  "rounded-xl border transition-colors",
                  isOpen ? "border-brand-300 bg-brand-50/40" : "border-border bg-card"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-navy-950">{faq.q}</span>
                  <ChevronDown
                    className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
