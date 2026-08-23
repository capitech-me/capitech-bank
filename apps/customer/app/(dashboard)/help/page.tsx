import Link from "next/link";
import {
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Coins,
  ShieldCheck,
  ReceiptText,
  LifeBuoy,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { SUPPORT_EMAIL } from "@capitech/lib";
import { HelpFaq, type FaqCategory } from "@/components/help-faq";

const HELP_CATEGORIES: FaqCategory[] = [
  {
    category: "Accounts",
    icon: Wallet,
    items: [
      {
        q: "How long does it take to open an account?",
        a: "Personal accounts are usually opened in under 10 minutes. Corporate onboarding takes a bit longer because of the additional KYC documentation we review — typically 1 to 2 business days.",
      },
      {
        q: "Which countries and currencies are supported?",
        a: "Capitech supports customers in 190+ countries and accounts in 30+ currencies (ISO 4217). Multi-currency accounts let you hold, send and receive in several currencies simultaneously.",
      },
      {
        q: "How do term deposits work?",
        a: "Choose an amount, a term (from 7 days) and a currency. Your money earns a fixed interest rate for the term and is returned with interest at maturity. You can opt for automatic rollover.",
      },
      {
        q: "How do I close my account?",
        a: "You can close your account anytime from Settings, or by contacting support@capitech.me. Remaining balances are returned to your linked account before closure.",
      },
    ],
  },
  {
    category: "Transfers",
    icon: ArrowLeftRight,
    items: [
      {
        q: "How long do transfers take?",
        a: "Internal transfers between Capitech accounts are instant. SEPA transfers arrive within one business day, and most international transfers settle in 1–3 business days depending on the destination.",
      },
      {
        q: "Can I cancel a transfer?",
        a: "Transfers still in pending status can be cancelled from the Transfers screen. Once a transfer has been authorised and posted, it can no longer be cancelled — please contact support if you believe there is an error.",
      },
    ],
  },
  {
    category: "Cards",
    icon: CreditCard,
    items: [
      {
        q: "What are virtual cards and how do they work?",
        a: "A virtual card is a digital payment card with its own number, linked to your account. You can create one instantly, set daily and monthly limits, restrict merchants, and freeze it at any time — perfect for online spending and subscriptions.",
      },
      {
        q: "How do I freeze or unfreeze my card?",
        a: "Open the Cards screen, select the card and tap Freeze. The freeze takes effect immediately and blocks all new transactions. Unfreeze any time with a single tap.",
      },
    ],
  },
  {
    category: "Crypto",
    icon: Coins,
    items: [
      {
        q: "Does Capitech support crypto?",
        a: "Yes — custodial crypto wallets with live market prices are part of our roadmap. You will be able to buy, sell and hold digital assets directly from your Capitech account.",
      },
    ],
  },
  {
    category: "Security",
    icon: ShieldCheck,
    items: [
      {
        q: "Is my money protected?",
        a: "Yes. We apply bank-grade security: two-factor authentication, encryption in transit and at rest, tokenised card data, and database-level isolation between customers. All transactions are recorded on an immutable double-entry ledger.",
      },
      {
        q: "What should I do if I notice suspicious activity?",
        a: "Freeze the affected card from the Cards screen immediately, then contact support@capitech.me. Our team will review the transactions, block any compromise and help you secure your account.",
      },
    ],
  },
  {
    category: "Fees",
    icon: ReceiptText,
    items: [
      {
        q: "What does Capitech charge?",
        a: "Personal accounts have no monthly maintenance fee. Card and transfer fees are small and always shown clearly before you confirm a transaction, so there are never surprises.",
      },
      {
        q: "Are there fees for international transfers?",
        a: "International transfers carry a small flat fee plus a transparent FX spread. The exact amount is displayed on the confirmation screen before you approve the transfer.",
      },
    ],
  },
];

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

      <HelpFaq categories={HELP_CATEGORIES} />

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
