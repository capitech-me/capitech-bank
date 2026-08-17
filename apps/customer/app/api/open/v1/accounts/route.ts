import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiKey, ownerAccounts, enforceApiKeyQuota } from "../helpers";

/** GET /api/open/v1/accounts — list accounts owned by the API key's owner. */
export async function GET(req: NextRequest) {
  const { ctx, response } = await requireApiKey(req, "read");
  if (response) return response;

  const limited = await enforceApiKeyQuota(req, ctx!);
  if (limited) return limited;

  try {
    const accounts = await ownerAccounts(ctx!);
    return NextResponse.json({
      data: accounts.map((a: any) => ({
        id: a.id,
        account_no: a.account_no,
        iban: a.iban,
        bic: a.swift_bic,
        currency: a.currency,
        status: a.status,
        nickname: a.nickname,
        product: a.products?.[0]?.name ?? a.products?.name ?? null,
        product_type: a.products?.[0]?.product_type ?? a.products?.product_type ?? null,
        ledger_balance: a.ledger_balance,
        available_balance: a.available_balance,
        frozen: a.frozen,
      })),
    });
  } catch (err) {
    console.error("[openapi] accounts error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
