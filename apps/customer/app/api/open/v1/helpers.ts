import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient, withRateLimit } from "@capitech/db";
import { authenticateApiKey, hasScope, SCOPES, type ApiKeyContext, type Scope } from "@capitech/openapi";

/**
 * Shared Open API helpers: resolve the caller from the Bearer key,
 * load the owner's accounts, and build uniform error responses.
 */

// Per-key quota (S-7): enforced against api_usage_logs when readable,
// falling back to a per-IP in-memory limit.
const QUOTA_LIMIT = 120;
const QUOTA_WINDOW_MS = 60_000;

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

/**
 * Per-API-key rate limit (S-7). Counts requests for this key within the
 * window from api_usage_logs; on 429 the caller must back off. If the table
 * is not readable, falls back to a per-IP in-memory limit. Records each
 * request as a usage log row (best-effort).
 */
export async function enforceApiKeyQuota(
  req: NextRequest,
  ctx: ApiKeyContext
): Promise<Response | null> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - QUOTA_WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .from("api_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", ctx.keyId)
    .gte("created_at", since);

  if (error) {
    // Table not readable → per-IP fallback.
    return withRateLimit(req, QUOTA_LIMIT, QUOTA_WINDOW_MS);
  }

  if ((count ?? 0) >= QUOTA_LIMIT) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_ms: QUOTA_WINDOW_MS },
      { status: 429, headers: { "Retry-After": String(Math.ceil(QUOTA_WINDOW_MS / 1000)) } }
    );
  }

  try {
    await supabase.from("api_usage_logs").insert({
      tenant_id: ctx.tenantId,
      api_key_id: ctx.keyId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      status_code: null,
    });
  } catch {
    // non-fatal — quota tracking is best-effort
  }
  return null;
}

/** Load the accounts owned by the key's owner. */
export async function ownerAccounts(ctx: ApiKeyContext) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_no, iban, swift_bic, currency, status, nickname, ledger_balance, available_balance, frozen, products(name, product_type)")
    .eq("owner_type", ctx.ownerType)
    .eq("owner_id", ctx.ownerId)
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
