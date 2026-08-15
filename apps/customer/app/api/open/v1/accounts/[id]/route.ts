import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@capitech/db";
import { requireApiKey, ownerAccounts, apiError } from "../../helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/open/v1/accounts/[id] — account detail (owner-scoped). */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { ctx, response } = await requireApiKey(req, "read");
  if (response) return response;

  const accounts = await ownerAccounts(ctx!);
  const account = accounts.find((a: any) => a.id === id);
  if (!account) return apiError("not_found", 404);

  return NextResponse.json({ data: account });
}

/** GET /api/open/v1/accounts/[id]/transactions — statement-style transactions. */
export async function transactions(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { ctx, response } = await requireApiKey(req, "read");
  if (response) return response;

  const accounts = await ownerAccounts(ctx!);
  const account = accounts.find((a: any) => a.id === id);
  if (!account) return apiError("not_found", 404);

  const supabase = createAdminClient();
  const [orders, cardTx] = await Promise.all([
    supabase
      .from("payment_orders")
      .select("*")
      .or(`from_account_id.eq.${id},to_account_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("card_transactions")
      .select("*, cards(account_id)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const txs = (orders.data ?? [])
    .filter((o: any) => o.from_account_id === id || o.to_account_id === id)
    .map((o: any) => ({
      id: o.id,
      type: o.tx_type,
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      direction: o.from_account_id === id ? "out" : "in",
      reference: o.reference ?? o.order_no,
      narration: o.narration,
      created_at: o.created_at,
    }))
    .concat(
      (cardTx.data ?? [])
        .filter((c: any) => c.cards?.account_id === id)
        .map((c: any) => ({
          id: c.id,
          type: c.tx_type,
          status: c.status,
          amount: c.amount,
          currency: c.currency,
          direction: c.tx_type === "card_refund" ? "in" : "out",
          reference: c.mcc ?? "",
          narration: c.merchant_name,
          created_at: c.created_at,
        }))
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ data: txs });
}
