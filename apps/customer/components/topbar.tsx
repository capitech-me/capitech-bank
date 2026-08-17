"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Settings,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@capitech/ui";
import { getBrowserClient } from "@/lib/supabase-browser";

interface TopbarProps {
  userName: string;
  userEmail: string;
  unreadCount: number;
  mfaEnabled: boolean;
}

export function Topbar({ userName, userEmail, unreadCount, mfaEnabled }: TopbarProps) {
  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3006";
    window.location.href = landingUrl;
  }

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground sm:text-base">Welcome back</h2>
        <p className="hidden text-sm font-semibold text-navy-950 sm:block">{userName}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <a href="/app/notifications">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-8">
                <AvatarFallback className="bg-brand-100 text-brand-700">{initials || "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-sm font-medium md:block">{userName}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-navy-950">{userName}</p>
              <p className="text-xs font-normal text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/app/profile">
                <Settings className="size-4" /> Profile & Security
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/app/notifications">
                <Bell className="size-4" /> Notifications
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" />
              {mfaEnabled ? "MFA enabled" : "MFA not enabled"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
