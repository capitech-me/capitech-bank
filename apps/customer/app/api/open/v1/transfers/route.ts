import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@capitech/db";
import { requireApiKey, ownerAccounts, apiError } from "../helpers";
import { dispatchWebhooks } from "@capitech/openapi";

/**
 * POST /api/open/v1/transfers — create a payment order.
 * Body: { from_account_id, amount, currency, to_account_id | to_iban, reference?, narration? }
 * Maker–checker: the order is created as "pending" and must be authorised by the back office.
 */

export async function POST(req: NextRequest) {
  const { ctx, response } = await requireApiKey(req, "write:transfers");
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const { from_account_id, amount, currency, to_account_id, to_iban, reference, narration } = body as any;

  if (!from_account_id || !amount || !currency || (!to_account_id && !to_iban)) {
    return apiError("bad_request", 400, "from_account_id, amount, currency and a destination are required");
  }
  if (typeof amount !== "number" || amount <= 0) {
    return apiError("bad_request", 400, "amount must be a positive number");
  }

  // The source account must belong to the key owner
  const accounts = await ownerAccounts(ctx!);
  const source = accounts.find((a: any) => a.id === from_account_id);
  if (!source) return apiError("forbidden", 403, "from_account_id is not owned by this key");
  if (source.currency !== currency) return apiError("bad_request", 400, "currency does not match source account");

  // Resolve a member profile to act as created_by (maker)
  const supabase = createAdminClient();
  let makerProfileId: string | null = null;
  if (ctx!.ownerType === "organization") {
    const { data: member } = await supabase
      .from("organization_members")
      .select("profile_id")
      .eq("organization_id", ctx!.ownerId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    makerProfileId = member?.profile_id ?? null;
  } else {
    const { data: customer } = await supabase
      .from("customers")
      .select("profile_id")
      .eq("id", ctx!.ownerId)
      .maybeSingle();
    makerProfileId = customer?.profile_id ?? null;
  }
  if (!makerProfileId) {
    return apiError("unprocessable", 422, "no authorised user linked to this key");
  }

  const txType = to_account_id ? "internal_transfer" : "withdrawal";

  const { data: order, error } = await supabase
    .from("payment_orders")
    .insert({
      tenant_id: ctx!.tenantId,
      order_no: `PAY-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
      tx_type: txType,
      status: "pending",
      amount,
      currency,
      from_account_id,
      to_account_id: to_account_id ?? null,
      to_iban: to_iban ? String(to_iban).replace(/\s/g, "") : null,
      to_beneficiary_name: body.to_beneficiary_name ?? null,
      reference: reference ?? null,
      narration: narration ?? null,
      created_by: makerProfileId,
    })
    .select()
    .single();
  if (error || !order) {
    console.error("[openapi] transfer insert failed", error);
    return apiError("internal", 500);
  }

  // Notify subscribers
  await dispatchWebhooks(
    "payment.created",
    {
      order_no: order.order_no,
      tx_type: order.tx_type,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    },
    ctx!.tenantId
  ).catch(() => {});

  return NextResponse.json({ data: order }, { status: 201 });
}
