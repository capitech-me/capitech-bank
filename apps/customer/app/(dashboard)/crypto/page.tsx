"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Landmark, TrendingUp, CircleDollarSign, ArrowLeftRight, Loader2, Wallet } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { formatMoney } from "@capitech/lib";
import { cn } from "@capitech/ui";
import { getBrowserClient } from "@/lib/supabase-browser";

interface PriceRow {
  asset: string;
  price_usd: string;
  change_24h: string;
  market_cap: string | null;
  updated_at?: string;
}
interface WalletRow {
  asset: string;
  balance: string;
  address: string | null;
}
interface OrderRow {
  id: string;
  side: string;
  asset: string;
  amount_fiat: string | null;
  amount_asset: string | null;
  price: string | null;
  status: string;
  created_at: string;
}

const ASSET_ICONS: Record<string, any> = {
  BTC: CircleDollarSign,
  ETH: Landmark,
  SOL: Coins,
  USDT: TrendingUp,
};

export default function CryptoPage() {
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [fiatAccounts, setFiatAccounts] = useState<{ id: string; label: string; currency: string; balance: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceStale, setPriceStale] = useState(false);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [asset, setAsset] = useState("BTC");
  const [fiatAccount, setFiatAccount] = useState("");
  const [amountFiat, setAmountFiat] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPrices = useCallback(async () => {
    const res = await fetch("/api/crypto/prices?assets=BTC,ETH,SOL,USDT").then((r) => r.json());
    const map: Record<string, PriceRow> = {};
    for (const p of res.data ?? []) map[p.asset] = p;
    setPrices(map);
    setPriceStale(!!res.stale);
  }, []);

  const loadData = useCallback(async () => {
    const supabase = getBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }
    const [w, o, acc] = await Promise.all([
      supabase.from("crypto_wallets").select("asset, balance, address"),
      supabase.from("crypto_orders").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("accounts").select("id, currency, nickname, available_balance, products(name)"),
    ]);
    setWallets((w.data ?? []).map((r: any) => ({ asset: r.asset, balance: r.balance, address: r.address })));
    setOrders((o.data ?? []).map((r: any) => ({ id: r.id, side: r.side, asset: r.asset, amount_fiat: r.amount_fiat, amount_asset: r.amount_asset, price: r.price, status: r.status, created_at: r.created_at })));
    setFiatAccounts(
      (acc.data ?? [])
        .filter((a: any) => a.products?.[0]?.product_type === "current" || a.products?.product_type === "current")
        .map((a: any) => ({
          id: a.id,
          label: `${a.nickname ?? "Account"} · ${a.currency}`,
          currency: a.currency,
          balance: a.available_balance,
        }))
    );
    if (!fiatAccount && (acc.data ?? []).length > 0) setFiatAccount((acc.data as any[])[0].id);
    setLoading(false);
  }, [fiatAccount]);

  useEffect(() => {
    loadPrices();
    const t = setInterval(loadPrices, 60_000);
    return () => clearInterval(t);
  }, [loadPrices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const price = Number(prices[asset]?.price_usd ?? 0);
  const wallet = wallets.find((w) => w.asset === asset);
  const walletBalance = wallet ? Number(wallet.balance) : 0;

  async function executeTrade() {
    if (!fiatAccount || !amountFiat || Number(amountFiat) <= 0) {
      toast.error("Select an account and enter an amount");
      return;
    }
    if (side === "sell" && walletBalance < Number(amountFiat) / price) {
      toast.error("Insufficient crypto balance");
      return;
    }
    setBusy(true);
    const supabase = getBrowserClient();
    const { error } = await supabase.rpc("execute_crypto_order", {
      p_account_id: fiatAccount,
      p_side: side,
      p_asset: asset,
      p_amount_fiat: Number(amountFiat),
      p_price: price,
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    toast.success(`${side === "buy" ? "Bought" : "Sold"} ${asset} successfully`);
    setAmountFiat("");
    setBusy(false);
    loadData();
    loadPrices();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Crypto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy, sell and hold digital assets — custodial wallets with live market prices.
            {priceStale && <span className="ml-2 text-amber-600">(prices delayed)</span>}
          </p>
        </div>
        <Badge variant="info" className="w-fit">Powered by CoinGecko</Badge>
      </div>

      {/* Live prices */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["BTC", "ETH", "SOL", "USDT"].map((a) => {
          const p = prices[a];
          const Icon = ASSET_ICONS[a] ?? Coins;
          const change = p ? Number(p.change_24h) : 0;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setAsset(a)}
              className={cn(
                "rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5",
                asset === a ? "border-brand-500 ring-2 ring-brand-200" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="size-4.5" />
                </div>
                <Badge variant={change >= 0 ? "success" : "destructive"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</Badge>
              </div>
              <p className="mt-4 font-semibold text-navy-950">{a}</p>
              <p className="text-xs text-muted-foreground">{p ? `$${Number(p.price_usd).toLocaleString()}` : "…"}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trade panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-brand-600" /> Trade
            </CardTitle>
            <CardDescription>Convert fiat to crypto and back at the live rate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
              <TabsList className="w-full">
                <TabsTrigger value="buy" className="flex-1">Buy</TabsTrigger>
                <TabsTrigger value="sell" className="flex-1">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["BTC", "ETH", "SOL", "USDT"].map((a) => (
                    <SelectItem key={a} value={a}>
                      {a} {prices[a] ? `· $${Number(prices[a].price_usd).toLocaleString()}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Funding account</Label>
              <Select value={fiatAccount} onValueChange={setFiatAccount}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {fiatAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label} · {formatMoney(a.balance, a.currency)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({fiatAccounts.find((a) => a.id === fiatAccount)?.currency ?? "USD"})</Label>
              <Input id="amount" inputMode="decimal" value={amountFiat} onChange={(e) => setAmountFiat(e.target.value)} placeholder="0.00" className="h-11 text-lg font-semibold" />
              {price > 0 && Number(amountFiat) > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ {((Number(amountFiat) / price)).toLocaleString(undefined, { maximumFractionDigits: 8 })} {asset}
                  {side === "sell" && walletBalance > 0 && ` · wallet balance ${walletBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset}`}
                </p>
              )}
            </div>

            <Button onClick={executeTrade} disabled={busy || !price} className="w-full" size="lg">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {side === "buy" ? `Buy ${asset}` : `Sell ${asset}`}
            </Button>
          </CardContent>
        </Card>

        {/* Wallets */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4 text-brand-600" /> Your wallets
              </CardTitle>
              <CardDescription>Custodial balances in your bank account.</CardDescription>
            </CardHeader>
            <CardContent>
              {wallets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No crypto yet — buy your first asset to get started.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {wallets.map((w) => (
                    <li key={w.asset} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-navy-100 text-navy-600">
                          {(() => { const I = ASSET_ICONS[w.asset] ?? Coins; return <I className="size-4" />; })()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{w.asset}</p>
                          <p className="font-mono text-xs text-muted-foreground">{w.address?.slice(0, 10)}…</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-navy-950">
                          {Number(w.balance).toLocaleString(undefined, { maximumFractionDigits: 8 })} {w.asset}
                        </p>
                        {prices[w.asset] && (
                          <p className="text-xs text-muted-foreground">
                            ≈ {formatMoney(Number(w.balance) * Number(prices[w.asset].price_usd), "USD")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Order history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {orders.slice(0, 6).map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-navy-950">
                          <span className={cn(o.side === "buy" ? "text-emerald-600" : "text-red-600")}>
                            {o.side === "buy" ? "Bought" : "Sold"}
                          </span> {o.asset}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.amount_asset} @ {Number(o.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Badge variant={o.status === "filled" ? "success" : "neutral"}>{o.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
