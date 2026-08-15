import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";

/** Server client bound to the request cookies — server components only. */
export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Called from a Server Component — safe to ignore when middleware refreshes sessions
      }
    },
  });
}
