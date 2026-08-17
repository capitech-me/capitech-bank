import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, rateLimit } from "@capitech/db";
import { kycEmail, sendEmail } from "@capitech/email";

/**
 * Didit KYC webhook — https://app.capitech.me/api/webhooks/didit
 *
 * Pipeline (in order): timestamp freshness → canonical V2 re-serialise →
 * constant-time HMAC-SHA256 vs X-Signature-V2 → event_id validation →
 * event-based rate limit → event_id idempotency →
 * dispatch on status (case-sensitive literals) → 2xx within 5 seconds.
 *
 * The webhook is the SOURCE OF TRUTH for verification decisions.
 * Decision write failures return 500 so Didit retries (M-3).
 */

// Per-event bucket: retries of the SAME event id share a budget, so legitimate
// Didit retries are not blocked by a raw IP cap (S-7).
const EVENT_RATE_LIMIT = 30;
const EVENT_RATE_WINDOW_MS = 60_000;
const MAX_EVENT_ID_LENGTH = 200;

// Whole-number floats (1.0) -> integers (1), recursively — matches Didit's canonicalisation.
function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, shortenFloats(x)])
    );
  }
  if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0) return Math.trunc(v);
  return v;
}

// Recursive lexicographic key sort (array order preserved).
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature-v2") ?? "";
  const ts = Number(req.headers.get("x-timestamp"));
  const secret = process.env.DIDIT_WEBHOOK_SECRET;

  // 1. Freshness — reject anything older/newer than 300s (replay protection).
  if (!secret) {
    return NextResponse.json({ error: "didit_webhook_secret_not_configured" }, { status: 503 });
  }
  if (!ts || Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response("stale", { status: 401 });
  }

  // 2. Canonicalise: shortenFloats → sortKeys → JSON.stringify (unescaped Unicode, JS default).
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response("bad body", { status: 400 });
  }

  // 2b. Validate event_id BEFORE idempotency — malformed events are rejected (M-3).
  if (
    typeof parsed.event_id !== "string" ||
    parsed.event_id.length === 0 ||
    parsed.event_id.length > MAX_EVENT_ID_LENGTH
  ) {
    return new Response("bad event_id", { status: 400 });
  }

  const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));

  // 3. Constant-time HMAC-SHA256 compare against X-Signature-V2.
  const expected = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return new Response("bad sig", { status: 401 });
  }

  // 3b. Rate limit keyed on the event id — legit Didit retries share one bucket,
  // while a runaway retry loop for a single event is capped (S-7).
  const eventLimit = rateLimit(`didit:event:${parsed.event_id}`, {
    limit: EVENT_RATE_LIMIT,
    windowMs: EVENT_RATE_WINDOW_MS,
  });
  if (!eventLimit.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((eventLimit.retryAfterMs ?? 0) / 1000));
    return new Response("rate limited", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  // 4. Idempotency — dedupe on event_id (unique per delivery attempt).
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("operation_logs")
    .select("id")
    .eq("entity_type", "didit_event")
    .eq("entity_id", parsed.event_id)
    .maybeSingle();
  if (existing) {
    return new Response("ok"); // already processed
  }

  // 5. Apply the decision.
  const vendorData = parsed.vendor_data ?? parsed.metadata?.user_id;
  const sessionId = parsed.session_id;

  try {
    if (parsed.status === "Approved") {
      await applyDecision(vendorData, {
        kyc_status: "approved",
        kyc_level: "level_2",
      });
      await bestEffort(notifyUser(vendorData, "Identity verified", "Your identity verification was approved. Welcome aboard!", "kyc"));
      await bestEffort(emailUser(vendorData, "approved"));
    } else if (parsed.status === "Declined") {
      await applyDecision(vendorData, { kyc_status: "rejected" });
      await bestEffort(notifyUser(vendorData, "Verification declined", "We could not verify your identity. Please review the details and try again.", "kyc"));
      await bestEffort(emailUser(vendorData, "declined"));
    } else if (parsed.status === "In Review") {
      await applyDecision(vendorData, { kyc_status: "pending" });
      await bestEffort(notifyUser(vendorData, "Verification in review", "Your identity verification is being reviewed by our compliance team.", "kyc"));
      await bestEffort(emailUser(vendorData, "review"));
    } else if (parsed.status === "Resubmitted") {
      // Reviewer asked the user to retry specific steps — reopen to draft.
      await applyDecision(vendorData, { kyc_status: "draft", kyc_level: "unverified" });
      await bestEffort(notifyUser(vendorData, "Action needed", "Some verification documents need to be resubmitted. Please start a new verification.", "kyc"));
      await bestEffort(emailUser(vendorData, "resubmit"));
    } else if (parsed.status === "Kyc Expired") {
      await applyDecision(vendorData, { kyc_status: "draft", kyc_level: "unverified" });
      await bestEffort(notifyUser(vendorData, "Re-verification needed", "Your verification has expired. Please re-verify your identity.", "kyc"));
      await bestEffort(emailUser(vendorData, "expired"));
    }
    // Not Started | In Progress | Awaiting User | Abandoned | Expired → no-op (logged below)
  } catch (err) {
    // DB write failure — surface it so Didit retries instead of acking (M-3).
    console.error("[didit-webhook] decision apply failed", err);
    return new Response("error", { status: 500 });
  }

  // Record idempotency + audit (append-only log), keep the payload for review.
  try {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", vendorData ?? "00000000-0000-4000-8000-000000000000")
      .maybeSingle();
    const { data: defaultTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", "capitech")
      .single();
    await supabase.from("operation_logs").insert({
      tenant_id: profileRow?.tenant_id ?? defaultTenant?.id,
      actor_id: null,
      action: "didit.webhook",
      entity_type: "didit_event",
      entity_id: parsed.event_id,
      details: {
        session_id: sessionId,
        status: parsed.status,
        webhook_type: parsed.webhook_type,
        decision: parsed.decision ?? null,
      },
    });
  } catch (err) {
    console.error("[didit-webhook] audit insert failed", err);
  }

  // 6. Return 2xx within 5 seconds. Heavy work is offloaded by Didit's retry + our audit log.
  return new Response("ok");
}

/** Run a best-effort side effect (notifications/email) — never 500 on those. */
async function bestEffort(promise: Promise<void> | void): Promise<void> {
  try {
    await promise;
  } catch (err) {
    console.error("[didit-webhook] best-effort notification failed", err);
  }
}

/** Update the customer record linked to vendor_data (the auth user id). */
async function applyDecision(
  vendorData: string | undefined,
  patch: { kyc_status: string; kyc_level?: string }
) {
  if (!vendorData) return;
  const supabase = createAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", vendorData)
    .maybeSingle();
  if (error) throw error; // surface DB failure → route returns 500 so Didit retries
  if (customer) {
    const { error: updateError } = await supabase.from("customers").update(patch).eq("id", customer.id);
    if (updateError) throw updateError;
  }
}

/** Push an in-app notification to the user. */
async function notifyUser(vendorData: string | undefined, title: string, body: string, type = "kyc") {
  if (!vendorData) return;
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", vendorData)
    .maybeSingle();
  if (profile) {
    await supabase.from("notifications").insert({
      tenant_id: profile.tenant_id,
      profile_id: profile.id,
      type,
      title,
      body,
      read: false,
    });
  }
}

/** Send the KYC result email to the user. */
async function emailUser(vendorData: string | undefined, status: "approved" | "declined" | "review" | "resubmit" | "expired") {
  if (!vendorData) return;
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name")
    .eq("id", vendorData)
    .maybeSingle();
  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: "Capitech Bank — identity verification update",
      html: kycEmail({ status, firstName: profile.first_name ?? "there" }),
    });
  }
}
