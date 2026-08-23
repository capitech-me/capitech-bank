"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Pause, Play, Plus, Repeat, Trash2, Zap } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Switch } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { formatMoney, formatDateTime, parseAmount, isValidAmount, generateIban } from "@capitech/lib";
import { cn } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

interface AccountRow {
  id: string;
  currency: string;
  nickname: string | null;
  available_balance: string;
  products:
    | { name?: string; product_type?: string }
    | { name?: string; product_type?: string }[]
    | null;
}

interface StandingOrderRow {
  id: string;
  from_account_id: string;
  to_iban: string;
  to_bic: string | null;
  to_beneficiary_name: string | null;
  amount: string;
  currency: string;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  narration: string | null;
  status: string;
  next_run_at: string | null;
  created_at: string;
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
] as const;

const FREQUENCY_LABEL: Record<string, string> = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" };

function frequencyDescription(order: StandingOrderRow): string {
  if (order.frequency === "weekly") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const label = days[((order.day_of_week ?? 1) % 7)];
    return `Every ${label}`;
  }
  const ordinal = order.day_of_month ?? 1;
  const suffix = ordinal === 1 ? "st" : ordinal === 2 ? "nd" : ordinal === 3 ? "rd" : "th";
  return order.frequency === "quarterly" ? `Quarterly on the ${ordinal}${suffix}` : `Monthly on the ${ordinal}${suffix}`;
}

const demoAccounts: AccountRow[] = [
  { id: "acct-100", currency: "USD", nickname: "Everyday", available_balance: "24580.42", products: { name: "Multi-Currency Current" } },
  { id: "acct-200", currency: "EUR", nickname: "Travel", available_balance: "12340.00", products: { name: "Euro Current" } },
  { id: "acct-300", currency: "GBP", nickname: "Rainy day", available_balance: "8120.50", products: { name: "Savings Plus" } },
];

const demoOrders: StandingOrderRow[] = [
  {
    id: "so-1",
    from_account_id: "acct-100",
    to_iban: generateIban("DE", "2040601010"),
    to_bic: "DEUTDEFFXXX",
    to_beneficiary_name: "Berlin Rent GmbH",
    amount: "950.00",
    currency: "USD",
    frequency: "monthly",
    day_of_month: 1,
    day_of_week: null,
    narration: "Monthly rent",
    status: "active",
    next_run_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
  },
  {
    id: "so-2",
    from_account_id: "acct-200",
    to_iban: generateIban("GB", "3123456789"),
    to_bic: "HBUKGB4BXXX",
    to_beneficiary_name: "InsureCo Ltd",
    amount: "120.00",
    currency: "EUR",
    frequency: "weekly",
    day_of_month: null,
    day_of_week: 1,
    narration: "Insurance premium",
    status: "paused",
    next_run_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
];

/** Compute the next run date for a frequency (client-side; pg_cron is the stub for the server side). */
function computeNextRun(frequency: string, dayOfMonth: number | null, dayOfWeek: number | null): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  if (frequency === "weekly") {
    const target = dayOfWeek ?? 1;
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  } else {
    const months = frequency === "quarterly" ? 3 : 1;
    d.setMonth(d.getMonth() + months);
    const day = dayOfMonth ?? 1;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return d.toISOString();
}

export default function StandingOrdersPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [orders, setOrders] = useState<StandingOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [toIban, setToIban] = useState("");
  const [toBic, setToBic] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [narration, setNarration] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAccounts(demoAccounts);
      setOrders(demoOrders);
      setFromAccountId(demoAccounts[0]?.id ?? "");
      setLoading(false);
      return;
    }
    const supabase = getBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }
    const [acc, ord] = await Promise.all([
      supabase.from("accounts").select("id, currency, nickname, available_balance, products(name, product_type)"),
      supabase.from("standing_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setAccounts((acc.data ?? []) as AccountRow[]);
    setOrders((ord.data ?? []) as StandingOrderRow[]);
    if (!fromAccountId && (acc.data ?? []).length > 0) setFromAccountId((acc.data ?? [])[0].id);
    setLoading(false);
  }, [fromAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedAccount = accounts.find((a) => a.id === fromAccountId);
  const amountValid = selectedAccount ? isValidAmount(amount, selectedAccount.currency) : false;
  const dayOfMonthNum = Math.min(Math.max(Number(dayOfMonth) || 1, 1), 31);
  // ISO weekday: 1=Monday … 7=Sunday (matches the day_of_week 1-7 check constraint)
  const dayOfWeekNum = Math.min(Math.max(Number(dayOfWeek), 1), 7);

  async function handleCreate() {
    if (!selectedAccount || !amountValid || !toIban.trim()) {
      toast.error("Select an account, enter an amount and a destination IBAN");
      return;
    }
    const nextRun = computeNextRun(frequency, frequency === "weekly" ? null : dayOfMonthNum, frequency === "weekly" ? dayOfWeekNum : null);
    setSaving(true);

    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("standing_orders").insert({
        from_account_id: fromAccountId,
        to_iban: toIban.replace(/\s/g, ""),
        to_bic: toBic.replace(/\s/g, "") || null,
        to_beneficiary_name: beneficiaryName || null,
        amount: Number(parseAmount(amount)),
        currency: selectedAccount.currency,
        frequency,
        day_of_month: frequency === "weekly" ? null : dayOfMonthNum,
        day_of_week: frequency === "weekly" ? dayOfWeekNum : null,
        narration: narration || null,
        status: "active",
        next_run_at: nextRun,
      });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Standing order created");
      setSaving(false);
      setCreateOpen(false);
      setAmount("");
      setToIban("");
      setToBic("");
      setBeneficiaryName("");
      setNarration("");
      loadData();
      return;
    }

    // Demo mode
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Standing order created (demo)");
    setSaving(false);
    setCreateOpen(false);
    setAmount("");
    setToIban("");
    setToBic("");
    setBeneficiaryName("");
    setNarration("");
    loadData();
  }

  async function setStatus(order: StandingOrderRow, status: string) {
    setBusyId(order.id);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase
        .from("standing_orders")
        .update({ status })
        .eq("id", order.id);
      if (error) {
        toast.error(error.message);
        setBusyId(null);
        return;
      }
      toast.success(status === "active" ? "Standing order resumed" : "Standing order paused");
    } else {
      await new Promise((r) => setTimeout(r, 400));
      toast.success(status === "active" ? "Standing order resumed (demo)" : "Standing order paused (demo)");
    }
    setBusyId(null);
    loadData();
  }

  async function removeOrder(order: StandingOrderRow) {
    setBusyId(order.id);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("standing_orders").delete().eq("id", order.id);
      if (error) {
        toast.error(error.message);
        setBusyId(null);
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 400));
    }
    toast.success("Standing order deleted");
    setBusyId(null);
    loadData();
  }

  async function runNow(order: StandingOrderRow) {
    setBusyId(order.id);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      // "Run now" uses the same maker path as a normal transfer: create_payment
      // creates a pending order that staff execute (existing sandbox flow).
      const { error } = await supabase.rpc("create_payment", {
        p_tx_type: "internal_transfer",
        p_amount: Number(order.amount),
        p_currency: order.currency,
        p_from_account_id: order.from_account_id,
        p_to_iban: order.to_iban,
        p_to_bic: order.to_bic,
        p_to_beneficiary_name: order.to_beneficiary_name,
        p_reference: `SO-${order.id.slice(0, 8)}`,
        p_narration: order.narration ?? `Standing order ${order.frequency}`,
      });
      if (error) {
        toast.error(error.message);
        setBusyId(null);
        return;
      }
      toast.success("Payment created — queued for processing");
    } else {
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`Payment of ${formatMoney(order.amount, order.currency)} queued (demo)`);
    }
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Standing orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recurring payments on a weekly, monthly or quarterly schedule. Auto-execution is sandbox-stubbed — use “Run now” to trigger a payment instantly.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New standing order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a standing order</DialogTitle>
              <DialogDescription>Schedule a recurring payment from one of your accounts.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>From account</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname ?? "Account"} · {a.currency} · {formatMoney(a.available_balance, a.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="so-amount">Amount</Label>
                <div className="relative">
                  <Input id="so-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {selectedAccount?.currency ?? "USD"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="so-iban">Destination IBAN</Label>
                <Input id="so-iban" value={toIban} onChange={(e) => setToIban(e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="so-bic">BIC / SWIFT</Label>
                  <Input id="so-bic" value={toBic} onChange={(e) => setToBic(e.target.value)} placeholder="DEUTDEFFXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="so-beneficiary">Beneficiary name</Label>
                  <Input id="so-beneficiary" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Berlin Rent GmbH" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {frequency === "weekly" ? (
                <div className="space-y-2">
                  <Label>Day of week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        { v: "1", l: "Monday" },
                        { v: "2", l: "Tuesday" },
                        { v: "3", l: "Wednesday" },
                        { v: "4", l: "Thursday" },
                        { v: "5", l: "Friday" },
                        { v: "6", l: "Saturday" },
                        { v: "7", l: "Sunday" },
                      ].map((d) => (
                        <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="so-day">Day of month</Label>
                  <Input id="so-day" type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="so-narration">Narration (optional)</Label>
                <Textarea id="so-narration" rows={2} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="What is this for?" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !amountValid}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Create standing order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-14">
            <Loader2 className="size-5 animate-spin text-brand-400" />
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CalendarClock className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-white">No standing orders</h3>
            <p className="mt-1 text-sm text-muted-foreground">Set up a recurring payment for rent, subscriptions or savings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orders.map((order) => {
            const account = accounts.find((a) => a.id === order.from_account_id);
            const active = order.status === "active";
            return (
              <Card key={order.id} className={cn(!active && "opacity-75")}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Repeat className="size-4 text-brand-400" />
                      {formatMoney(order.amount, order.currency)}
                    </CardTitle>
                    <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : order.status}</Badge>
                  </div>
                  <CardDescription>
                    {frequencyDescription(order)} · from {account?.nickname ?? "Account"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium text-navy-100">{order.to_beneficiary_name ?? "External beneficiary"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{order.to_iban}{order.to_bic ? ` · ${order.to_bic}` : ""}</p>
                    {order.narration && <p className="mt-1 text-xs text-muted-foreground">{order.narration}</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Next run</p>
                      <p className={cn("font-semibold", active ? "text-navy-100" : "text-muted-foreground")}>
                        {order.next_run_at ? formatDateTime(order.next_run_at) : "Paused"}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Paused
                      <Switch
                        checked={active}
                        disabled={busyId === order.id}
                        onCheckedChange={(checked) => setStatus(order, checked ? "active" : "paused")}
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === order.id}
                      onClick={() => runNow(order)}
                      className="gap-1.5"
                    >
                      {busyId === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-brand-400" />}
                      Run now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === order.id}
                      onClick={() => setStatus(order, active ? "paused" : "active")}
                      className="gap-1.5"
                    >
                      {active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                      {active ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === order.id}
                      onClick={() => removeOrder(order)}
                      className="ml-auto gap-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
