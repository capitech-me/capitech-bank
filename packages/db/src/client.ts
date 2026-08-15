/**
 * Supabase clients — browser, server (Next.js) and admin (service role).
 * All clients read configuration from environment variables.
 */

import { createBrowserClient as createBrowserSupabaseClient } from "@supabase/ssr";
import { createServerClient as createServerSupabaseClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type { Session, User } from "@supabase/supabase-js";

const supabaseUrl = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-key-not-configured";
const supabaseServiceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-key-not-configured";

/** Browser singleton client (use in client components). */
export function createBrowserClient() {
  return createBrowserSupabaseClient(supabaseUrl(), supabaseAnonKey());
}

/**
 * Server client bound to the request cookies (use in Server Components / Route Handlers).
 * `cookieStore` is the result of `await cookies()` from next/headers.
 */
export async function createServerClient(cookieStore: { getAll: () => { name: string; value: string }[]; set: (name: string, value: string, options?: unknown) => void; remove: (name: string, options?: unknown) => void }) {
  return createServerSupabaseClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore when middleware refreshes sessions
        }
      },
    },
  });
}

/** Admin client with service role — SERVER ONLY. Never expose to the browser. */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
