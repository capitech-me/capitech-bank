"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button, Logo } from "@capitech/ui";

const NAV_LINKS = [
  { href: "/personal", label: "Personal" },
  { href: "/business", label: "Business" },
  { href: "#features", label: "Features" },
  { href: "#developers", label: "Developers" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy-950/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Capitech Bank home">
          <Logo dark />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" className="text-navy-100 hover:bg-white/5 hover:text-white">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/sign-up">
              Open account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-md text-navy-100 hover:bg-white/5 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-navy-950 px-4 pb-6 pt-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-navy-100 hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Button asChild variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/5">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/sign-up">
                Open account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
