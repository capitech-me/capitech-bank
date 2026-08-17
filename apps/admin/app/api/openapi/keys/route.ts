import { NextResponse } from "next/server";
import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";
import { generateApiKey } from "@capitech/openapi";

interface CreateApiKeyBody {
  owner_type?: string;
  owner_id?: string;
  name?: string;
  scopes?: string[];
}

/**
 * Admin — create an Open API key for a customer/organization.
 * POST { owner_type, owner_id, name, scopes } → returns the raw key ONCE.
 */

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

  const body = (await req.json().catch(() => ({}))) as CreateApiKeyBody;
  const { owner_type, owner_id, name, scopes } = body;
  if (!owner_type || !["customer", "organization"].includes(owner_type) || !owner_id || !name) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // M-2: the requested owner must belong to the admin's tenant.
  const adminTenantId = profile!.tenant_id;
  const ownerTable = owner_type === "customer" ? "customers" : "organizations";
  const { data: owner } = await supabase
    .from(ownerTable)
    .select("id")
    .eq("id", owner_id)
    .eq("tenant_id", adminTenantId)
    .maybeSingle();
  if (!owner) {
    return NextResponse.json(
      { error: "bad_request", detail: "owner not found in this tenant" },
      { status: 400 }
    );
  }

  const allowedScopes = ["read", "write:transfers", "webhooks", "admin"];
  const cleanScopes = (scopes ?? ["read"]).filter((s: string) => allowedScopes.includes(s));
  if (cleanScopes.length === 0) cleanScopes.push("read");

  const { raw, hash, prefix } = generateApiKey();
  const { data: key, error } = await supabase
    .from("api_keys")
    .insert({
      tenant_id: adminTenantId,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes: cleanScopes,
      status: "active",
      owner_type,
      owner_id,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) {
    console.error("[admin] api key create failed", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ data: key, raw_key: raw }, { status: 201 });
}
