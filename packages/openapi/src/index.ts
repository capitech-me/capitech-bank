import { createHash, createHmac, randomBytes } from "node:crypto";
import { createAdminClient } from "@capitech/db";
import { isSafeWebhookUrl } from "./ssrf";
export * from "./ssrf";

/**
 * Capitech Open API — key management, bearer auth, webhook dispatch.
 * Server-only (uses the service-role admin client for lookups).
 */

export const API_KEY_PREFIX = "capt_live_";

export const SCOPES = {
  READ: "read",
  TRANSFERS: "write:transfers",
  WEBHOOKS: "webhooks",
  ADMIN: "admin",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

export interface ApiKeyContext {
  keyId: string;
  tenantId: string;
  ownerType: "customer" | "organization";
  ownerId: string;
  scopes: Scope[];
}

/** sha256 hex — how API keys are stored at rest (raw key is shown once). */
export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Generate a new raw API key (the only time it is ever visible). */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, 14) };
}

/** Resolve a bearer token to a key context (or null). Updates last_used_at. */
export async function authenticateApiKey(
  authorizationHeader: string | null
): Promise<{ ctx: ApiKeyContext | null; error?: string }> {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return { ctx: null, error: "missing_bearer" };
  }
  const raw = authorizationHeader.slice("Bearer ".length).trim();
  const hash = hashKey(raw);
  const supabase = createAdminClient();
  const { data: key, error } = await supabase
    .from("api_keys")
    .select("id, tenant_id, owner_type, owner_id, scopes, status, expires_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !key) {
    return { ctx: null, error: "invalid_key" };
  }
  if (key.status !== "active") {
    return { ctx: null, error: "revoked" };
  }
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
    return { ctx: null, error: "expired" };
  }
  if (!key.owner_id) {
    return { ctx: null, error: "key_not_bound" };
  }
  // best-effort last-used touch
  try {
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  } catch {
    // non-fatal
  }
  return {
    ctx: {
      keyId: key.id,
      tenantId: key.tenant_id,
      ownerType: key.owner_type,
      ownerId: key.owner_id,
      scopes: (key.scopes ?? ["read"]) as Scope[],
    },
  };
}

/** Check that a context has a required scope. */
export function hasScope(ctx: ApiKeyContext, scope: Scope): boolean {
  return ctx.scopes.includes(scope) || ctx.scopes.includes("admin");
}

/* ============================================================
   Webhook dispatch
   ============================================================ */

export const WEBHOOK_EVENTS = [
  "payment.created",
  "payment.updated",
  "customer.created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** HMAC signature header value for a webhook payload. */
export function signWebhookPayload(secret: string, payload: unknown): string {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

/**
 * Dispatch an event to all active webhook endpoints subscribed to it.
 * Best-effort: failures are recorded in webhook_events, never thrown.
 */
export async function dispatchWebhooks(event: WebhookEvent, payload: unknown, tenantId: string) {
  const supabase = createAdminClient();
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, events")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  for (const ep of endpoints ?? []) {
    if (!(ep.events ?? []).includes(event)) continue;
    const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });
    const signature = signWebhookPayload(ep.secret, JSON.parse(body));

    // SSRF re-check (S-10): the stored URL may have changed or now resolve
    // to an internal address — never dispatch to an unsafe endpoint.
    let safe = false;
    try {
      safe = await isSafeWebhookUrl(ep.url);
    } catch {
      safe = false;
    }
    if (!safe) {
      try {
        await supabase.from("webhook_events").insert({
          tenant_id: tenantId,
          endpoint_id: ep.id,
          event_type: event,
          payload: JSON.parse(body),
          status: "failed",
          attempts: 1,
        });
      } catch {
        // ignore
      }
      continue;
    }

    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Capitech-Event": event,
          "X-Capitech-Signature": signature,
          "User-Agent": "Capitech-Webhook/1.0",
        },
        body,
        // fail fast so we never hold a request hostage
        signal: AbortSignal.timeout(5000),
      });
      await supabase.from("webhook_events").insert({
        tenant_id: tenantId,
        endpoint_id: ep.id,
        event_type: event,
        payload: JSON.parse(body),
        status: res.ok ? "delivered" : "failed",
        attempts: 1,
      });
    } catch (err) {
      try {
        await supabase.from("webhook_events").insert({
          tenant_id: tenantId,
          endpoint_id: ep.id,
          event_type: event,
          payload: JSON.parse(body),
          status: "failed",
          attempts: 1,
        });
      } catch {
        // ignore
      }
    }
  }
}
