import { NextResponse } from "next/server";
import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";
import { buildCsv, buildPdf, type StatementData, type StatementTx } from "@/lib/statements";

/**
 * GET /api/statements/[accountId]?format=pdf|csv&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Authenticated; the user may only download statements for their own accounts (RLS).
 */

interface RouteContext {
  params: Promise<{ accountId: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  const { accountId } = await params;

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

  // Account (RLS ensures ownership)
  const { data: account, error: acctError } = await supabase
    .from("accounts")
    .select("id, account_no, iban, currency, nickname, available_balance, products(name)")
    .eq("id", accountId)
    .maybeSingle();
  if (acctError || !account) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "pdf";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const periodStart = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const periodEnd = to ?? new Date().toISOString().slice(0, 10);

  // Gather transactions: payment_orders (in/out) + card_transactions (out)
  const [orders, cardTx] = await Promise.all([
    supabase
      .from("payment_orders")
      .select("*")
      .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .gte("created_at", `${periodStart}T00:00:00Z`)
      .lte("created_at", `${periodEnd}T23:59:59Z`)
      .order("created_at", { ascending: false }),
    supabase
      .from("card_transactions")
      .select("*, cards(account_id)")
      .gte("created_at", `${periodStart}T00:00:00Z`)
      .lte("created_at", `${periodEnd}T23:59:59Z`)
      .order("created_at", { ascending: false }),
  ]);

  const txs: StatementTx[] = [];

  for (const o of orders.data ?? []) {
    const isFrom = o.from_account_id === accountId;
    const isTo = o.to_account_id === accountId;
    if (!isFrom && !isTo) continue;
    const amount = isFrom ? -Number(o.amount) : Number(o.amount);
    txs.push({
      id: o.id,
      date: o.created_at,
      type: o.tx_type,
      description: o.narration ?? o.to_beneficiary_name ?? o.order_no,
      reference: o.reference ?? o.order_no,
      amount: amount.toFixed(2),
      currency: o.currency,
    });
  }
  for (const c of cardTx.data ?? []) {
    if (c.cards?.account_id !== accountId) continue;
    const amount = c.tx_type === "card_refund" ? Number(c.amount) : -Number(c.amount);
    txs.push({
      id: c.id,
      date: c.created_at,
      type: c.tx_type,
      description: `${c.merchant_name ?? "Card payment"} (•••• ${c.card_id})`,
      reference: c.mcc ?? "",
      amount: amount.toFixed(2),
      currency: c.currency,
    });
  }

  txs.sort((a, b) => (a.date < b.date ? 1 : -1));

  // Derive running balances: newest-first, start at current balance
  const current = Number(account.available_balance);
  let running = current;
  const withBalances: StatementTx[] = [];
  for (const t of txs) {
    withBalances.push({ ...t, balanceAfter: running.toFixed(2) });
    running -= Number(t.amount); // balance before this tx
  }
  withBalances.reverse(); // chronological for the report
  const openingBalance = running.toFixed(2);

  const productsArr = Array.isArray(account.products) ? account.products : [account.products];
  const statement: StatementData = {
    accountLabel: account.nickname ?? productsArr[0]?.name ?? "Account",
    accountNo: account.account_no,
    iban: account.iban ?? "",
    currency: account.currency,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance: current.toFixed(2),
    transactions: withBalances,
  };

  if (format === "csv") {
    const csv = buildCsv(statement);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="statement-${account.account_no}.csv"`,
      },
    });
  }

  const pdf = await buildPdf(statement);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement-${account.account_no}.pdf"`,
    },
  });
}
