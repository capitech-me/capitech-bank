"use client";

import { useState } from "react";
import { PiggyBank, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@capitech/ui";
import { formatMoney, formatPercent, formatDate } from "@capitech/lib";
import { toast } from "@capitech/ui";
import { cn } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { sendClientEmail } from "@/lib/email-client";
import type { DepositVM } from "@/lib/data";

const TERMS = [7, 30, 90, 180, 365];

function OpenDepositDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [term, setTerm] = useState(90);
  const [rollover, setRollover] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setLoading(true);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      // open_deposit derives customer/currency/rate and posts the placement journal.
      const { error } = await supabase.rpc("open_deposit", {
        p_account_id: accountId,
        p_product_id: "prod-deposit",
        p_principal: Number(principal),
        p_term_days: term,
        p_rollover: rollover,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const maturity = new Date();
      maturity.setDate(maturity.getDate() + term);
      toast.success("Term deposit opened");
      sendClientEmail("deposit_opened", {
        principal,
        currency: "USD",
        rate: "4.25",
        termDays: term,
        maturityDate: maturity.toISOString().slice(0, 10),
      });
      setOpen(false);
      window.location.reload();
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
    toast.success(`Term deposit of ${formatMoney(principal || "0", "USD")} opened`);
    sendClientEmail("deposit_opened", {
      principal,
      currency: "USD",
      rate: "4.25",
      termDays: term,
      maturityDate: new Date(new Date().setDate(new Date().getDate() + term)).toISOString().slice(0, 10),
    });
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Open deposit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a term deposit</DialogTitle>
          <DialogDescription>Lock in a fixed rate for a fixed term. Interest accrues daily.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="principal">Principal (USD)</Label>
            <Input id="principal" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="1000.00" />
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={term.toString()} onValueChange={(v) => setTerm(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map((t) => (
                  <SelectItem key={t} value={t.toString()}>{t} days · {formatPercent(t === 7 ? 2.5 : t === 30 ? 3.1 : t === 90 ? 4.25 : t === 180 ? 4.75 : 5.2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-3 text-sm text-navy-100">
            <input
              type="checkbox"
              checked={rollover}
              onChange={(e) => setRollover(e.target.checked)}
              className="size-4 rounded border-border accent-brand-600"
            />
            Automatically renew at maturity
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleOpen} disabled={loading || !principal}>{loading ? "Opening…" : "Open deposit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DepositsManager({ deposits, accountId }: { deposits: DepositVM[]; accountId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Term deposits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Grow your savings with fixed-rate deposits.</p>
        </div>
        <OpenDepositDialog accountId={accountId} />
      </div>

      {deposits.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <PiggyBank className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-white">No deposits yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Lock in competitive rates starting from 7 days.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {deposits.map((dep) => (
            <Card key={dep.id} className={cn(dep.status === "matured" && "opacity-70")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {formatMoney(dep.principal, dep.currency)}
                  <Badge variant={dep.status === "active" ? "success" : dep.status === "matured" ? "info" : "neutral"}>
                    {dep.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {formatPercent(dep.interestRate)} p.a. · {dep.termDays} days
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Matures</p>
                  <p className="font-semibold text-navy-100">{formatDate(dep.maturityDate)}</p>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Accrued interest</p>
                  <p className="font-semibold text-emerald-400">{formatMoney(dep.interestAccrued, dep.currency)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
