import { createBrowserClient } from "@capitech/db";

/** Browser client for client components. */
export function getBrowserClient() {
  return createBrowserClient();
}

export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
