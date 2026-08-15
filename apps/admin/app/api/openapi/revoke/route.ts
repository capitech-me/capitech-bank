import { NextResponse } from "next/server";
import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";

/** Admin — revoke an API key. */
export async function POST(req: Request) {
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

  const { keyId } = (await req.json().catch(() => ({}))) as { keyId?: string };
  if (!keyId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { error } = await supabase
    .from("api_keys")
    .update({ status: "revoked" })
    .eq("id", keyId)
    .eq("tenant_id", profile!.tenant_id);
  if (error) return NextResponse.json({ error: "internal" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
