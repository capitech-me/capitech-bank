"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Loader2, RefreshCcw, BadgePercent } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Alert, AlertDescription } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { formatMoney, parseAmount, isValidAmount, generateIban } from "@capitech/lib";
import { cn } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

interface FiatAccountRow {
  id: string;
  currency: string;
  nickname: string | null;
  account_no: string;
  iban: string;
  status: string;
  frozen: boolean;
  available_balance: string;
  products:
    | { name?: string; product_type?: string }
    | { name?: string; product_type?: string }[]
    | null;
}

interface RateResponse {
  from: string;
  to: string;
  rate: number;
  demo?: boolean;
  fetched_at?: string;
}

const FX_FEE_RATE = 0.005; // 0.5% — must match convert_currency()'s p_fee_rate default

const demoAccounts: FiatAccountRow[] = [
  {
    id: "acct-100",
    currency: "USD",
    nickname: "Everyday",
    account_no: "1002345678",
    iban: generateIban("DE", "1002345678"),
    status: "active",
    frozen: false,
    available_balance: "24580.42",
    products: { name: "Multi-Currency Current", product_type: "current" },
  },
  {
    id: "acct-200",
    currency: "EUR",
    nickname: "Travel",
    account_no: "1008765432",
    iban: generateIban("DE", "1008765432"),
    status: "active",
    frozen: false,
    available_balance: "12340.00",
    products: { name: "Euro Current", product_type: "current" },
  },
  {
    id: "acct-300",
    currency: "GBP",
    nickname: "Rainy day",
    account_no: "2200112233",
    iban: generateIban("GB", "2200112233"),
    status: "active",
    frozen: false,
    available_balance: "8120.50",
    products: { name: "Savings Plus", product_type: "savings" },
  },
];

function normalizeAccount(row: FiatAccountRow) {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;
  return {
    id: row.id,
    currency: row.currency,
    nickname: row.nickname,
    accountNo: row.account_no,
    iban: row.iban,
    status: row.status,
    frozen: row.frozen,
    availableBalance: row.available_balance,
    productName: product?.name ?? "Account",
  };
}

export default function ConvertPage() {
  const [accounts, setAccounts] = useState<ReturnType<typeof normalizeAccount>[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [rateDemo, setRateDemo] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastQuote, setLastQuote] = useState<{ from: string; to: string; amount: string; rate: number; fee: number; converted: number } | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  const fromCurrency = fromAccount?.currency ?? "";
  const toCurrency = toAccount?.currency ?? "";

  const currencies = Array.from(new Set(accounts.map((a) => a.currency)));
  const toCurrencies = currencies.filter((c) => c !== fromCurrency);
  const fromAccounts = accounts.filter((a) => a.currency === fromCurrency);
  const toAccounts = accounts.filter((a) => a.currency === toCurrency);

  const amountValid = fromCurrency ? isValidAmount(amount, fromCurrency) : false;
  const amountNumber = fromCurrency && amountValid ? Number(amount) : 0;
  const fee = amountNumber * FX_FEE_RATE;
  const converted = rate && amountNumber ? Number((amountNumber * rate).toFixed(2)) : 0;
  const totalDebit = amountNumber + fee;
  const insufficient = fromAccount ? totalDebit > Number(fromAccount.availableBalance) : false;

  const loadAccounts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      const list = demoAccounts.map(normalizeAccount);
      setAccounts(list);
      setFromAccountId(list[0]?.id ?? "");
      const toFirst = list.find((a) => a.currency !== list[0]?.currency);
      setToAccountId(toFirst?.id ?? "");
      return;
    }
    const supabase = getBrowserClient();
    const { data, error } = await supabase
      .from("accounts")
      .select("id, currency, nickname, account_no, iban, status, frozen, available_balance, products(name, product_type)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = ((data ?? []) as FiatAccountRow[]).filter((a) => a.status === "active" && !a.frozen).map(normalizeAccount);
    setAccounts(list);
    if (list.length > 0) {
      setFromAccountId(list[0].id);
      const toFirst = list.find((a) => a.currency !== list[0].currency);
      setToAccountId(toFirst?.id ?? list[0].id);
    }
  }, []);

  const fetchRate = useCallback(async (from: string, to: string) => {
    if (!from || !to || from === to) {
      setRate(null);
      return;
    }
    setRateLoading(true);
    try {
      const res = await fetch(`/app/api/fx/rate?from=${from}&to=${to}`);
      const data: RateResponse = await res.json();
      if (res.ok && data.rate) {
        setRate(data.rate);
        setRateDemo(!!data.demo);
      } else {
        setRate(null);
      }
    } catch {
      setRate(null);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (fromCurrency && toCurrency) {
      fetchRate(fromCurrency, toCurrency);
    }
  }, [fromCurrency, toCurrency, fetchRate]);

  async function handleConvert() {
    if (!fromAccount || !toAccount || !amountValid || !rate) return;
    setBusy(true);

    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.rpc("convert_currency", {
        p_from_account_id: fromAccount.id,
        p_to_account_id: toAccount.id,
        p_amount: Number(parseAmount(amount)),
        p_rate: rate,
        p_fee_rate: FX_FEE_RATE,
        p_reference: `FX-${Date.now()}`,
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      toast.success(`Converted ${fromCurrency} to ${toCurrency}`);
      setLastQuote({ from: fromCurrency, to: toCurrency, amount, rate, fee, converted });
      setAmount("");
      setBusy(false);
      setSuccess(true);
      await loadAccounts();
      return;
    }

    // Demo mode: simulate success
    await new Promise((r) => setTimeout(r, 700));
    toast.success(`Converted ${formatMoney(amount, fromCurrency)} to ${formatMoney(converted, toCurrency)}`);
    setLastQuote({ from: fromCurrency, to: toCurrency, amount, rate, fee, converted });
    setAmount("");
    setBusy(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Convert</h1>
          <p className="mt-1 text-sm text-muted-foreground">Move money between your accounts in different currencies.</p>
        </div>
        <Card className="max-w-xl">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <ArrowLeftRight className="size-7" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-white">Conversion complete</h2>
            {lastQuote && (
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {formatMoney(lastQuote.amount, lastQuote.from)} → {formatMoney(lastQuote.converted, lastQuote.to)}{" "}
                @ {lastQuote.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                <span className="text-navy-100"> (fee {formatMoney(lastQuote.fee, lastQuote.from)})</span>
              </p>
            )}
            <Button className="mt-6" onClick={() => setSuccess(false)}>
              Make another conversion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Convert</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Convert between your account currencies at a live rate.
            {rateDemo && <span className="ml-2 text-amber-400">(demo rate — upstream throttled)</span>}
          </p>
        </div>
        <Badge variant="info" className="w-fit">Powered by Alpha Vantage</Badge>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="text-sm text-muted-foreground">No accounts available — open an account to start converting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Conversion form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="size-5 text-brand-400" /> Convert currencies
              </CardTitle>
              <CardDescription>You keep the same funds, just in a new currency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>From account</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname ?? a.productName} · {a.currency} · {formatMoney(a.availableBalance, a.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From currency</Label>
                  <Select
                    value={fromCurrency}
                    onValueChange={(c) => {
                      const first = accounts.find((a) => a.currency === c);
                      setFromAccountId(first?.id ?? "");
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To currency</Label>
                  <Select
                    value={toCurrency}
                    onValueChange={(c) => {
                      const first = accounts.find((a) => a.currency === c);
                      setToAccountId(first?.id ?? "");
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {toCurrencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>To account</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {toAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname ?? a.productName} · {a.currency} · {formatMoney(a.availableBalance, a.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({fromCurrency || "USD"})</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-12 text-xl font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {fromCurrency}
                  </span>
                </div>
                {fromAccount && (
                  <p className="text-xs text-muted-foreground">
                    Available: {formatMoney(fromAccount.availableBalance, fromAccount.currency)}
                  </p>
                )}
                {insufficient && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription>Insufficient funds for this conversion (amount + fee).</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Exchange rate</span>
                <span className="flex items-center gap-2 font-semibold text-navy-100">
                  {rateLoading ? <Loader2 className="size-3.5 animate-spin" /> : rate ? (
                    <>
                      1 {fromCurrency} = {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCurrency}
                      <button
                        type="button"
                        onClick={() => fetchRate(fromCurrency, toCurrency)}
                        className="text-brand-400 hover:text-brand-300"
                        aria-label="Refresh rate"
                      >
                        <RefreshCcw className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              <Button
                onClick={handleConvert}
                size="lg"
                className="w-full"
                disabled={busy || !amountValid || !rate || insufficient || !fromAccount || !toAccount}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Convert {fromCurrency && amount ? formatMoney(amount, fromCurrency) : ""}
              </Button>
            </CardContent>
          </Card>

          {/* Quote summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgePercent className="size-4 text-brand-400" /> Quote summary
              </CardTitle>
              <CardDescription>What you pay and what arrives in the destination account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">You send</dt>
                  <dd className="font-semibold text-navy-100">{amount ? formatMoney(amount, fromCurrency) : "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">FX fee (0.5%)</dt>
                  <dd className="font-semibold text-amber-400">{amount ? formatMoney(fee, fromCurrency) : "—"}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <dt className="font-medium text-navy-100">Total debit</dt>
                  <dd className="font-bold text-white">{amount ? formatMoney(totalDebit, fromCurrency) : "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">You receive</dt>
                  <dd className={cn("font-bold", amount && rate ? "text-emerald-400" : "text-navy-100")}>
                    {amount && rate ? formatMoney(converted, toCurrency) : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Rate</dt>
                  <dd className="font-medium text-navy-100">
                    {rate ? `1 ${fromCurrency} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toCurrency}` : "—"}
                  </dd>
                </div>
              </dl>

              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Conversions are settled at the displayed rate through our nostro account. Balances update instantly.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
