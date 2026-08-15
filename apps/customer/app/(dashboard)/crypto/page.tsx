import { Coins, Landmark, Lock, Bell, TrendingUp, CircleDollarSign } from "lucide-react";
import { Badge, Button } from "@capitech/ui";
import { formatMoney } from "@capitech/lib";

const PRICES = [
  { asset: "BTC", name: "Bitcoin", price: "61240.50", change: "+2.4%", icon: CircleDollarSign },
  { asset: "ETH", name: "Ethereum", price: "3421.18", change: "+1.8%", icon: Landmark },
  { asset: "SOL", name: "Solana", price: "146.72", change: "-0.6%", icon: Coins },
  { asset: "USDT", name: "Tether", price: "1.00", change: "0.0%", icon: TrendingUp },
];

export default function CryptoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Crypto</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buy, sell and hold digital assets — custodial wallets with live prices.</p>
        </div>
        <Badge variant="warning" className="py-1.5">
          <Bell className="size-3.5" /> Launching in Phase 2
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRICES.map((coin) => (
          <div key={coin.asset} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <coin.icon className="size-4.5" />
              </div>
              <Badge variant={coin.change.startsWith("+") ? "success" : "neutral"}>{coin.change}</Badge>
            </div>
            <p className="mt-4 font-semibold text-navy-950">{coin.name}</p>
            <p className="text-xs text-muted-foreground">{coin.asset}</p>
            <p className="mt-2 text-lg font-bold text-navy-950">${coin.price}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <h3 className="mt-4 font-semibold text-navy-950">Crypto trading is on its way</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Custodial wallets for BTC, ETH, SOL and stablecoins with instant fiat conversion will be
          available in the next phase. Follow your notifications to be first in line.
        </p>
        <Button variant="outline" className="mt-5">Get notified</Button>
      </div>
    </div>
  );
}
