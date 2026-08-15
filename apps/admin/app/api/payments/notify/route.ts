import { NextResponse } from "next/server";
import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";
import { emailDate, sendEmail, transferEmail } from "@capitech/email";
import { dispatchWebhooks } from "@capitech/openapi";

/**
 * Payment decision notification (admin app).
 * Called by the back office after authorising/rejecting a payment order.
 * Emails the customer who created the order.
 * Auth: staff session only.
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
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Staff only
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "";
  if (!role.startsWith("staff_") && role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { orderId, decision } = (await req.json().catch(() => ({}))) as { orderId?: string; decision?: "approved" | "rejected" };
  if (!orderId || !decision) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const adminClient = await createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: () => {},
  });
  void adminClient;

  // Look up the order + creator's email
  const { data: order } = await supabase
    .from("payment_orders")
    .select("amount, currency, to_iban, to_beneficiary_name, reference, narration, created_by, status, fee_amount, tenant_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Notify Open API subscribers of the status change
  await dispatchWebhooks(
    "payment.updated",
    {
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      decision,
    },
    order.tenant_id
  ).catch(() => {});

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("email, first_name")
    .eq("id", order.created_by)
    .maybeSingle();
  if (!creatorProfile?.email) {
    return NextResponse.json({ ok: false, error: "no_recipient" });
  }

  const subject =
    decision === "approved"
      ? "Your transfer has been processed"
      : "Your transfer was not processed";

  const html = transferEmail({
    direction: "sent",
    firstName: creatorProfile.first_name ?? "there",
    amount: String(order.amount),
    currency: order.currency,
    counterparty: order.to_beneficiary_name ?? order.to_iban ?? "external account",
    reference: order.reference ?? "—",
    date: emailDate(new Date()),
  });

  const result = await sendEmail({ to: creatorProfile.email, subject, html });
  return NextResponse.json({ ok: result.ok, error: result.error ?? null });
}
