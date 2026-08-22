import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-browser";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userName = "Operations";
  let roleLabel = "Administrator";

  if (isSupabaseConfigured()) {
    const supabase = await getServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    // Server-side guard: no session or non-staff => back to sign-in.
    // Catches the bare /admin root too, which the edge proxy's matcher can
    // miss under the basePath rewrite.
    if (!user) {
      redirect("/sign-in");
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role;
    if (!role || !(role.startsWith("staff_") || role === "super_admin")) {
      redirect("/sign-in");
    }
    if (profile) {
      userName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || userName;
      const labels: Record<string, string> = {
        staff_teller: "Teller",
        staff_operations: "Operations Officer",
        staff_compliance: "Compliance Officer",
        staff_accountant: "Accountant",
        staff_admin: "Administrator",
        super_admin: "Super Admin",
      };
      roleLabel = labels[role] ?? roleLabel;
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} roleLabel={roleLabel} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
