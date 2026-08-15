import { NextResponse } from "next/server";
import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";

/** Admin — list API keys, webhook endpoints and recent deliveries. */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = await createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // ignore
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, tenant_id").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "";
  if (!role.startsWith("staff_") && role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tenantId = profile!.tenant_id;
  const [keys, endpoints, deliveries] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, status, last_used_at, owner_type, owner_id, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("webhook_endpoints")
      .select("id, url, events, active, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("webhook_events")
      .select("id, event_type, status, created_at, endpoint_id")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    keys: keys.data ?? [],
    endpoints: endpoints.data ?? [],
    deliveries: deliveries.data ?? [],
  });
}
