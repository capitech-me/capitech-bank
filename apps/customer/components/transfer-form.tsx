"use client";

import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@capitech/ui";
import { formatMoney, parseAmount, isValidAmount } from "@capitech/lib";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { sendClientEmail } from "@/lib/email-client";
import type { AccountVM } from "@/lib/data";

export function TransferForm({ accounts }: { accounts: AccountVM[] }) {
  const [fromAccount, setFromAccount] = useState(accounts[0]?.id ?? "");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === fromAccount);
  const amountValid = selectedAccount ? isValidAmount(amount, selectedAccount.currency) : false;
  const amountNumber = selectedAccount && amountValid ? Number(amount) : 0;
  const insufficient = selectedAccount ? amountNumber > Number(selectedAccount.availableBalance) : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
    setLoading(true);

    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      // Customers can only create internal-transfer orders (never deposit/withdrawal).
      // create_payment derives tenant/created_by server-side and always starts the
      // order as 'pending'; funds move only when staff call execute_payment.
      const { error } = await supabase.rpc("create_payment", {
        p_tx_type: "internal_transfer",
        p_amount: parseAmount(amount),
        p_currency: selectedAccount.currency,
        p_from_account_id: fromAccount,
        p_to_iban: toAccount.replace(/\s/g, ""),
        p_reference: reference || null,
        p_narration: narration || null,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Transfer scheduled for processing");
      sendClientEmail("transfer_sent", {
        amount: parseAmount(amount),
        currency: selectedAccount.currency,
        counterparty: toAccount,
        reference: reference || "Transfer",
      });
      setSuccess(true);
      setLoading(false);
      return;
    }

    // Demo mode: simulate success
    await new Promise((r) => setTimeout(r, 800));
    toast.success(`Transfer of ${formatMoney(amount, selectedAccount.currency)} initiated`);
    sendClientEmail("transfer_sent", {
      amount: parseAmount(amount),
      currency: selectedAccount.currency,
      counterparty: toAccount,
      reference: reference || "Transfer",
    });
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card className="max-w-xl">
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-navy-950">Transfer initiated</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {formatMoney(amount, selectedAccount?.currency ?? "USD")} on its way to{" "}
            <span className="font-medium text-navy-950">{toAccount}</span>. You will receive a
            notification when it settles.
          </p>
          <Button className="mt-6" onClick={() => { setSuccess(false); setAmount(""); setToAccount(""); }}>
            Make another transfer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="size-5 text-brand-600" /> New transfer
        </CardTitle>
        <CardDescription>Send money instantly to another Capitech account or to an external IBAN.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="from">From account</Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger id="from" className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nickname ?? account.productName} · {account.currency} · {formatMoney(account.availableBalance, account.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">Recipient</Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-600" />
              <Input
                id="to"
                required
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="Capitech account number or IBAN"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">For external transfers, enter the full IBAN (e.g. DE89 3704 0044 0532 0130 00).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-xl font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {selectedAccount?.currency ?? "USD"}
              </span>
            </div>
            {selectedAccount && (
              <p className="text-xs text-muted-foreground">
                Available: {formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}
              </p>
            )}
            {insufficient && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>Insufficient funds for this transfer.</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="narration">Narration (optional)</Label>
            <Textarea id="narration" rows={2} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="What is this payment for?" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice #123" maxLength={40} />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading || !amountValid || insufficient}>
            {loading ? "Sending…" : `Transfer ${amount ? formatMoney(amount, selectedAccount?.currency ?? "USD") : ""}`.trim()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
