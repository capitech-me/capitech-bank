import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@capitech/db";
import { requireApiKey, apiError, enforceApiKeyQuota } from "../helpers";
import { randomBytes } from "node:crypto";
import { isSafeWebhookUrl } from "@capitech/openapi";

/**
 * Webhook endpoint management (Open API).
 * GET  /api/open/v1/webhooks — list this key owner's endpoints + recent deliveries
 * POST /api/open/v1/webhooks — register a new endpoint (url + subscribed events)
 */

export async function GET(req: NextRequest) {
  const { ctx, response } = await requireApiKey(req, "webhooks");
  if (response) return response;
  const limited = await enforceApiKeyQuota(req, ctx!);
  if (limited) return limited;
  const supabase = createAdminClient();
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, active, created_at")
    .eq("tenant_id", ctx!.tenantId)
    .order("created_at", { ascending: false });
  return NextResponse.json({ data: endpoints ?? [] });
}

export async function POST(req: NextRequest) {
  const { ctx, response } = await requireApiKey(req, "webhooks");
  if (response) return response;
  const limited = await enforceApiKeyQuota(req, ctx!);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const { url, events } = body as { url?: string; events?: string[] };
  if (!url || !/^https:\/\//.test(url)) {
    return apiError("bad_request", 400, "url must be an https:// endpoint");
  }
  // SSRF guard (S-10): reject endpoints that resolve to internal/private hosts.
  const safe = await isSafeWebhookUrl(url);
  if (!safe) {
    return apiError("bad_request", 400, "url is not a safe public https endpoint");
  }
  const allowed = ["payment.created", "payment.updated", "customer.created"];
  const subscribed = (events ?? []).filter((e) => allowed.includes(e));
  if (subscribed.length === 0) {
    return apiError("bad_request", 400, "events must be a non-empty subset of " + allowed.join(", "));
  }

  const supabase = createAdminClient();
  const { data: endpoint, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      tenant_id: ctx!.tenantId,
      url,
      events: subscribed,
      secret: randomBytes(24).toString("hex"),
      active: true,
    })
    .select()
    .single();
  if (error) {
    console.error("[openapi] webhook create failed", error);
    return apiError("internal", 500);
  }
  return NextResponse.json({ data: endpoint }, { status: 201 });
}
