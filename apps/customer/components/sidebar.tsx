"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  Coins,
  Bell,
  UserCircle2,
  FileText,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo, cn } from "@capitech/ui";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; badge?: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/deposits", label: "Term Deposits", icon: PiggyBank },
  { href: "/crypto", label: "Crypto", icon: Coins },
  { href: "/statements", label: "Statements", icon: FileText },
];

const BOTTOM_ITEMS = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile & Security", icon: UserCircle2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/" aria-label="Capitech Bank home">
          <Logo dark />
        </Link>
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
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-navy-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-border px-3 py-4">
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
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>

      {/* Mobile header + sheet */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link href="/" aria-label="Capitech Bank home">
          <Logo dark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
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
