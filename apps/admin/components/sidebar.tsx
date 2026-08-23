"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Wallet,
  BookOpenText,
  ArrowLeftRight,
  Package,
  UserCog,
  ScrollText,
  ShieldCheck,
  KeyRound,
  BarChart3,
  Webhook,
  MessagesSquare,
  Menu,
  X,
} from "lucide-react";
import { Logo, cn } from "@capitech/ui";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/onboarding", label: "Onboarding & KYC", icon: ClipboardCheck, badge: "8" },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/ledger", label: "General Ledger", icon: BookOpenText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/payments", label: "Payment Approvals", icon: ArrowLeftRight, badge: "3" },
  { href: "/products", label: "Products", icon: Package },
  { href: "/open-api", label: "Open API", icon: KeyRound },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/contact", label: "Contact", icon: MessagesSquare },
];

const BOTTOM_ITEMS = [
  { href: "/staff", label: "Staff & Roles", icon: UserCog },
  { href: "/audit", label: "Audit Trail", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <Logo dark />
      </div>
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">
          <ShieldCheck className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Operations Console</p>
          <p className="text-[10px] text-navy-400">Back office</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand-600/20 text-brand-200" : "text-navy-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        {BOTTOM_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand-600/20 text-brand-200" : "text-navy-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-navy-950 lg:block">
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>

      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-navy-950 px-4 lg:hidden">
        <Logo dark />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex size-10 items-center justify-center rounded-md text-navy-100 hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-navy-950 shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 inline-flex size-8 items-center justify-center rounded-md text-navy-100 hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
