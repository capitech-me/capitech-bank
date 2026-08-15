import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@capitech/db";
import { authenticateApiKey, hasScope, SCOPES, type ApiKeyContext, type Scope } from "@capitech/openapi";

/**
 * Shared Open API helpers: resolve the caller from the Bearer key,
 * load the owner's accounts, and build uniform error responses.
 */

export function apiError(error: string, status = 401, detail?: unknown) {
  return NextResponse.json({ error, ...(detail !== undefined ? { detail } : {}) }, { status });
}

/** Authenticate the request and return the key context. */
export async function requireApiKey(
  req: NextRequest,
  scope: Scope
): Promise<{ ctx?: ApiKeyContext; response?: NextResponse }> {
  const { ctx, error } = await authenticateApiKey(req.headers.get("authorization"));
  if (!ctx) {
    return { response: apiError(error ?? "unauthorized") };
  }
  if (!hasScope(ctx, scope)) {
    return { response: apiError("insufficient_scope", 403) };
  }
  return { ctx };
}

/** Load the accounts owned by the key's owner. */
export async function ownerAccounts(ctx: ApiKeyContext) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_no, iban, swift_bic, currency, status, nickname, ledger_balance, available_balance, frozen, products(name, product_type)")
    .eq("owner_type", ctx.ownerType)
    .eq("owner_id", ctx.ownerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
