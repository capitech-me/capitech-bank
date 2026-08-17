import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-browser";
import { getNotifications } from "@/lib/data";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userName = "Customer";
  let userEmail = "customer@capitech.me";
  let unreadCount = 2;
  const mfaEnabled = false;

  if (isSupabaseConfigured()) {
    const supabase = await getServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) {
      userEmail = user.email ?? userEmail;
      const { data: profile } = await supabase.from("profiles").select("first_name, last_name").maybeSingle();
      if (profile) {
        userName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || userName;
      }
      const { data: notifications } = await supabase.from("notifications").select("id").eq("read", false).limit(1);
      unreadCount = notifications?.length ?? 0;
    }
  }

  const notifications = await getNotifications();
  if (notifications.some((n) => !n.read)) unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          userEmail={userEmail}
          unreadCount={unreadCount}
          mfaEnabled={mfaEnabled}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
