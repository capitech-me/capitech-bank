import Link from "next/link";
import { Logo } from "@capitech/ui";
import { APP_DOMAIN, SUPPORT_EMAIL } from "@capitech/lib";

const COLUMNS = [
  {
    title: "Banking",
    links: [
      { label: "Personal", href: "#personal" },
      { label: "Business", href: "#business" },
      { label: "Crypto", href: "#products" },
      { label: "Virtual cards", href: "#products" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Open API", href: "#developers" },
      { label: "API documentation", href: "#developers" },
      { label: "Sandbox", href: "#developers" },
      { label: "Webhooks", href: "#developers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Regulatory", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-400">
              Capitech Bank is a full-fledged digital banking platform offering
              multi-currency accounts, virtual cards, term deposits, crypto and open
              APIs for individuals and businesses worldwide.
            </p>
            <p className="mt-6 text-xs text-navy-500">
              © {new Date().getFullYear()} Capitech Bank. All rights reserved.
              <br />
              {APP_DOMAIN} · {SUPPORT_EMAIL}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-semibold text-white">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-navy-400 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-navy-500">
            Capitech Bank is a software demonstration platform. Services are simulated
            in a sandbox environment and do not constitute real financial advice or a
            licensed banking offer.
          </p>
        </div>
      </div>
    </footer>
  );
}
