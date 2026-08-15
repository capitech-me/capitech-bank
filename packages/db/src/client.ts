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
 * Pass the `cookies` accessor pair exactly like `@supabase/ssr` expects:
 *   cookies: { getAll: () => cookieStore.getAll(), setAll: (list) => list.forEach(({name,value,options}) => cookieStore.set(name,value,options)) }
 */
export async function createServerClient(cookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
}) {
  return createServerSupabaseClient(supabaseUrl(), supabaseAnonKey(), {
    cookies,
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
