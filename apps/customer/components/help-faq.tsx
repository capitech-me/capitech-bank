"use client";

import { useState } from "react";
import {
  ChevronDown,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Coins,
  ShieldCheck,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@capitech/ui";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  category: string;
  icon: LucideIcon;
  items: FaqItem[];
}

// Data lives in this client component so the server page never passes
// functions/icon components across the Server -> Client boundary.
const HELP_CATEGORIES: FaqCategory[] = [
  {
    category: "Accounts",
    icon: Wallet,
    items: [
      { q: "How long does it take to open an account?", a: "Personal accounts are usually opened in under 10 minutes. Corporate onboarding takes a bit longer because of the additional KYC documentation we review — typically 1 to 2 business days." },
      { q: "Which countries and currencies are supported?", a: "Capitech supports customers in 190+ countries and accounts in 30+ currencies (ISO 4217). Multi-currency accounts let you hold, send and receive in several currencies simultaneously." },
      { q: "How do term deposits work?", a: "Choose an amount, a term (from 7 days) and a currency. Your money earns a fixed interest rate for the term and is returned with interest at maturity. You can opt for automatic rollover." },
      { q: "How do I close my account?", a: "You can close your account anytime from Settings, or by contacting support@capitech.me. Remaining balances are returned to your linked account before closure." },
    ],
  },
  {
    category: "Transfers",
    icon: ArrowLeftRight,
    items: [
      { q: "How long do transfers take?", a: "Internal transfers between Capitech accounts are instant. SEPA transfers arrive within one business day, and most international transfers settle in 1–3 business days depending on the destination." },
      { q: "Can I cancel a transfer?", a: "Transfers still in pending status can be cancelled from the Transfers screen. Once a transfer has been authorised and posted, it can no longer be cancelled — please contact support if you believe there is an error." },
    ],
  },
  {
    category: "Cards",
    icon: CreditCard,
    items: [
      { q: "What are virtual cards and how do they work?", a: "A virtual card is a digital payment card with its own number, linked to your account. You can create one instantly, set daily and monthly limits, restrict merchants, and freeze it at any time — perfect for online spending and subscriptions." },
      { q: "How do I freeze or unfreeze my card?", a: "Open the Cards screen, select the card and tap Freeze. The freeze takes effect immediately and blocks all new transactions. Unfreeze any time with a single tap." },
    ],
  },
  {
    category: "Crypto",
    icon: Coins,
    items: [
      { q: "Does Capitech support crypto?", a: "Yes — custodial crypto wallets with live market prices are part of our offering. You can buy, sell and hold digital assets directly from your Capitech account." },
    ],
  },
  {
    category: "Security",
    icon: ShieldCheck,
    items: [
      { q: "Is my money protected?", a: "Yes. We apply bank-grade security: two-factor authentication, encryption in transit and at rest, tokenised card data, and database-level isolation between customers. All transactions are recorded on an immutable double-entry ledger." },
      { q: "What should I do if I notice suspicious activity?", a: "Freeze the affected card from the Cards screen immediately, then contact support@capitech.me. Our team will review the transactions, block any compromise and help you secure your account." },
    ],
  },
  {
    category: "Fees",
    icon: ReceiptText,
    items: [
      { q: "What does Capitech charge?", a: "Personal accounts have no monthly maintenance fee. Card and transfer fees are small and always shown clearly before you confirm a transaction, so there are never surprises." },
      { q: "Are there fees for international transfers?", a: "International transfers carry a small flat fee plus a transparent FX spread. The exact amount is displayed on the confirmation screen before you approve the transfer." },
    ],
  },
];

export function HelpFaq() {
  // Track one open item per category (indexed by category name).
  const [openByCategory, setOpenByCategory] = useState<Record<string, number>>({});

  return (
    <div className="space-y-8">
      {HELP_CATEGORIES.map((cat) => {
        const openIndex = openByCategory[cat.category] ?? 0;
        return (
          <section key={cat.category} id={cat.category.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-20">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">
                <cat.icon className="size-4" />
              </span>
              {cat.category}
            </h2>
            <div className="mt-3 space-y-2">
              {cat.items.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                  <div
                    key={item.q}
                    className={cn(
                      "rounded-xl border transition-colors",
                      isOpen ? "border-brand-500/30 bg-brand-600/10" : "border-border bg-card"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenByCategory((prev) => ({ ...prev, [cat.category]: isOpen ? -1 : i }))}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-medium text-navy-100">{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
