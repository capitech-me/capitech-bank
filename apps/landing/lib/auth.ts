import { createBrowserClient } from "@capitech/db";

/** Browser Supabase client (landing app). */
export function getSupabaseBrowserClient() {
  return createBrowserClient();
}

/** Where should a signed-in user land after auth? */
export function getPostAuthRedirect(role?: string | null) {
  const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ?? "http://localhost:3001";
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "http://localhost:3002";
  if (role && role.startsWith("staff_") && role !== "staff_teller") {
    return adminUrl;
  }
  if (role === "super_admin") {
    return adminUrl;
  }
  return customerUrl;
}
