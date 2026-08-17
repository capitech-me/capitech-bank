import Link from "next/link";
import { CheckCircle2, Bell, ShieldCheck, CreditCard, Info } from "lucide-react";
import { Badge } from "@capitech/ui";
import { formatRelativeTime } from "@capitech/lib";
import { getNotifications } from "@/lib/data";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";
import { cn } from "@capitech/ui";

function iconFor(type: string) {
  switch (type) {
    case "transaction":
      return { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-600" };
    case "security":
      return { icon: ShieldCheck, cls: "bg-brand-50 text-brand-600" };
    case "card":
      return { icon: CreditCard, cls: "bg-navy-100 text-navy-600" };
    default:
      return { icon: Info, cls: "bg-muted text-muted-foreground" };
  }
}

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-950">
            <Bell className="size-6 text-brand-600" /> Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Transaction alerts, security and account updates.</p>
        </div>
        <MarkNotificationsRead />
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const { icon: Icon, cls } = iconFor(n.type);
            return (
              <li
                key={n.id}
                className={cn(
                  "flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm",
                  !n.read && "border-brand-200 bg-brand-50/30"
                )}
              >
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", cls)}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-navy-950">{n.title}</p>
                    {!n.read && <Badge variant="info">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Manage email preferences in{" "}
        <Link href="/profile" className="font-medium text-brand-600 hover:underline">Profile &amp; Security</Link>.
      </div>
    </div>
  );
}
