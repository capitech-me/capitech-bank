"use client";

import { useState } from "react";
import { ArrowLeftRight, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Badge } from "@capitech/ui";
import { formatMoney, parseAmount, isValidAmount, COUNTRIES_BY_CODE } from "@capitech/lib";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { sendClientEmail } from "@/lib/email-client";
import type { AccountVM } from "@/lib/data";

/** Internal transfer fee — must match execute_payment (0.5%, capped at 20 units). */
function internalFee(amount: number): number {
  return Math.min(Math.max(amount * 0.005, 0.5), 20);
}

/** External transfer fee — must match execute_payment external_transfer branch (1.5%, min 15, capped 50). */
function externalFee(amount: number): number {
  return Math.min(Math.max(amount * 0.015, 15), 50);
}

export function TransferForm({ accounts }: { accounts: AccountVM[] }) {
  const [fromAccount, setFromAccount] = useState(accounts[0]?.id ?? "");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [reference, setReference] = useState("");
  // External (SWIFT/SEPA) beneficiary details
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState("");
  const [country, setCountry] = useState("DE");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === fromAccount);
  const amountValid = selectedAccount ? isValidAmount(amount, selectedAccount.currency) : false;
  const amountNumber = selectedAccount && amountValid ? Number(amount) : 0;

  // A destination that matches an internal Capitech account is an internal
  // transfer; anything else is routed over the (sandbox-simulated) external rails.
  const normalizedDest = toAccount.replace(/\s/g, "").toUpperCase();
  const internalMatch = accounts.find(
    (a) => a.accountNo === normalizedDest || a.iban?.replace(/\s/g, "").toUpperCase() === normalizedDest
  );
  const isExternal = toAccount.trim().length > 0 && !internalMatch;

  const fee = isExternal ? externalFee(amountNumber) : internalFee(amountNumber);
  const totalDebit = amountNumber + fee;
  const insufficient = selectedAccount ? totalDebit > Number(selectedAccount.availableBalance) : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
    if (isExternal && (!beneficiaryName.trim() || !bic.trim())) {
      toast.error("Please provide the beneficiary name and BIC/SWIFT for external transfers");
      return;
    }
    setLoading(true);

    const txType = isExternal ? "external_transfer" : "internal_transfer";
    const toIban = toAccount.replace(/\s/g, "");

    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      // Customers create the order; staff approve/execute it (existing maker flow).
      const { error } = await supabase.rpc("create_payment", {
        p_tx_type: txType,
        p_amount: parseAmount(amount),
        p_currency: selectedAccount.currency,
        p_from_account_id: fromAccount,
        p_to_iban: toIban,
        p_to_bic: isExternal ? bic.replace(/\s/g, "") || null : null,
        p_to_beneficiary_name: isExternal ? beneficiaryName || null : null,
        p_reference: reference || null,
        p_narration: narration || null,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success(isExternal ? "External transfer scheduled for processing" : "Transfer scheduled for processing");
      sendClientEmail("transfer_sent", {
        amount: parseAmount(amount),
        currency: selectedAccount.currency,
        counterparty: isExternal ? beneficiaryName : toAccount,
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
      counterparty: isExternal ? beneficiaryName : toAccount,
      reference: reference || "Transfer",
    });
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card className="max-w-xl">
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-white">{isExternal ? "External transfer initiated" : "Transfer initiated"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {formatMoney(amount, selectedAccount?.currency ?? "USD")} on its way to{" "}
            <span className="font-medium text-navy-100">
              {isExternal ? beneficiaryName || toAccount : toAccount}
            </span>
            {isExternal && " via SWIFT/SEPA"}. You will receive a notification when it settles.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setSuccess(false);
              setAmount("");
              setToAccount("");
              setBeneficiaryName("");
              setBic("");
            }}
          >
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
          <ArrowLeftRight className="size-5 text-brand-400" /> New transfer
        </CardTitle>
        <CardDescription>Send money instantly to another Capitech account or externally via SWIFT/SEPA.</CardDescription>
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
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
              <Input
                id="to"
                required
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="Capitech account number or IBAN"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isExternal ? "External destination detected — enter the beneficiary bank details below." : "For external transfers, enter the full IBAN (e.g. DE89 3704 0044 0532 0130 00)."}
            </p>
          </div>

          {isExternal && (
            <div className="space-y-4 rounded-xl border border-brand-400/30 bg-brand-600/5 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-navy-100">
                  <Building2 className="size-4 text-brand-400" /> Beneficiary bank
                </p>
                <Badge variant="info" className="border-transparent">SWIFT / SEPA</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiary name</Label>
                <Input id="beneficiary" required value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Jane Doe / ACME GmbH" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC / SWIFT</Label>
                  <Input id="bic" required value={bic} onChange={(e) => setBic(e.target.value)} placeholder="DEUTDEFFXXX" maxLength={11} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(COUNTRIES_BY_CODE)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .slice(0, 60)
                        .map((info) => (
                          <SelectItem key={info.alpha2} value={info.alpha2}>{info.alpha2} · {info.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank name (optional)</Label>
                <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Deutsche Bank AG" />
              </div>
            </div>
          )}

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
                <AlertDescription>Insufficient funds for this transfer (amount + fee).</AlertDescription>
              </Alert>
            )}
          </div>

          {amountValid && isExternal && (
            <div className="space-y-1.5 rounded-lg bg-muted px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transfer amount</span>
                <span className="font-medium text-navy-100">{formatMoney(amount, selectedAccount?.currency ?? "USD")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transfer fee (1.5%, min 15)</span>
                <span className="font-medium text-amber-400">{formatMoney(fee, selectedAccount?.currency ?? "USD")}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <span className="font-medium text-navy-100">Total debit</span>
                <span className="font-bold text-white">{formatMoney(totalDebit, selectedAccount?.currency ?? "USD")}</span>
              </div>
            </div>
          )}

          {amountValid && !isExternal && (
            <div className="space-y-1.5 rounded-lg bg-muted px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transfer fee (0.5%, max 20)</span>
                <span className="font-medium text-amber-400">{formatMoney(fee, selectedAccount?.currency ?? "USD")}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="narration">Narration (optional)</Label>
            <Textarea id="narration" rows={2} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="What is this payment for?" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice #123" maxLength={40} />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading || !amountValid || insufficient}>
            {loading ? "Sending…" : isExternal ? "Send external transfer" : `Transfer ${amount ? formatMoney(amount, selectedAccount?.currency ?? "USD") : ""}`.trim()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
