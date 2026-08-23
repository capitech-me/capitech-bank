"use client";

import { useState, type ReactNode } from "react";
import { CreditCard, Plus, Snowflake, Flame, Globe, Banknote, Nfc, Settings2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@capitech/ui";
import { formatMoney, formatCardExpiry } from "@capitech/lib";
import { toast } from "@capitech/ui";
import { cn } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { sendClientEmail } from "@/lib/email-client";
import type { CardVM } from "@/lib/data";

function CardVisual({ card }: { card: CardVM }) {
  const brandColor = card.brand === "visa" ? "from-brand-600 to-brand-900" : "from-navy-800 to-navy-950";
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg", brandColor)}>
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide">Capitech</span>
        <span className="text-xs tracking-widest text-white/70">{card.brand.toUpperCase()}</span>
      </div>
      <p className="mt-7 font-mono text-lg tracking-[0.2em]">•••• •••• •••• {card.last4}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-white/70">
        <span>{card.nameOnCard ?? "CARD HOLDER"}</span>
        <span>{formatCardExpiry(card.expMonth, card.expYear)}</span>
      </div>
    </div>
  );
}

function CreateCardDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("visa");
  const [nameOnCard, setNameOnCard] = useState("");
  const [dailyLimit, setDailyLimit] = useState("2000");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const last4 = Math.floor(1000 + Math.random() * 9000).toString();

      // Resolve the tenant the card belongs to (required, NOT NULL) and the
      // customer record linked to this profile (optional but correct to set).
      let tenantId: string | null = null;
      let customerId: string | null = null;
      if (userId) {
        const [profile, customer] = await Promise.all([
          supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle(),
          supabase.from("customers").select("id").eq("profile_id", userId).maybeSingle(),
        ]);
        tenantId = (profile.data?.tenant_id as string | null) ?? null;
        customerId = (customer.data?.id as string | null) ?? null;
      }
      if (!tenantId) {
        toast.error("Unable to identify your tenant — please try again.");
        setLoading(false);
        return;
      }

      const insertPayload: Record<string, unknown> = {
        account_id: accountId,
        tenant_id: tenantId,
        brand,
        last4,
        token: `tok_${Math.random().toString(36).slice(2)}`,
        exp_month: new Date().getMonth() + 1,
        exp_year: new Date().getFullYear() + 5,
        status: "active",
        name_on_card: nameOnCard.toUpperCase(),
        daily_limit: dailyLimit,
      };
      if (customerId) insertPayload.customer_id = customerId;

      const { error } = await supabase.from("cards").insert(insertPayload);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Virtual card created");
      sendClientEmail("card_created", { last4, brand });
      setOpen(false);
      window.location.reload();
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Virtual card created");
    sendClientEmail("card_created", { last4: "••••", brand });
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New virtual card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a virtual card</DialogTitle>
          <DialogDescription>Instant issuance. Set your limits and controls below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nameOnCard">Name on card</Label>
            <Input id="nameOnCard" value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} placeholder="e.g. JANE DOE" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily limit</Label>
            <Input id="dailyLimit" inputMode="decimal" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>{loading ? "Creating…" : "Create card"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A compact control row: label + icon on the left, Switch on the right. */
function ToggleRow({ icon, label, checked, disabled, onCheckedChange }: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-navy-100">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

function EditLimitsDialog({ card }: { card: CardVM }) {
  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState(card.dailyLimit ?? "");
  const [monthly, setMonthly] = useState(card.monthlyLimit ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    // Blank = no limit (NULL), numeric = new cap.
    const patch: Record<string, unknown> = {
      daily_limit: daily.trim() === "" ? null : Number(daily),
      monthly_limit: monthly.trim() === "" ? null : Number(monthly),
    };
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("cards").update(patch).eq("id", card.id);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Card limits updated");
    } else {
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Card limits updated");
    }
    setLoading(false);
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" /> Edit limits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit card limits</DialogTitle>
          <DialogDescription>Set spending limits for card •••• {card.last4}. Leave a field blank for no limit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`daily-${card.id}`}>Daily limit</Label>
            <Input id={`daily-${card.id}`} inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="2000.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`monthly-${card.id}`}>Monthly limit</Label>
            <Input id={`monthly-${card.id}`} inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="10000.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save limits"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CardsManager({ cards, defaultAccountId }: { cards: CardVM[]; defaultAccountId: string }) {
  const [saving, setSaving] = useState<string | null>(null);

  async function updateCard(card: CardVM, patch: Record<string, unknown>, successMsg: string) {
    setSaving(card.id);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("cards").update(patch).eq("id", card.id);
      if (error) {
        toast.error(error.message);
        setSaving(null);
        return;
      }
      toast.success(successMsg);
    } else {
      await new Promise((r) => setTimeout(r, 400));
      toast.success(successMsg);
    }
    setSaving(null);
    window.location.reload();
  }

  const busy = (card: CardVM) => saving === card.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Virtual cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, control and freeze cards in seconds.</p>
        </div>
        <CreateCardDialog accountId={defaultAccountId} />
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CreditCard className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-white">No cards yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first virtual card to start spending online.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="space-y-4">
                <CardVisual card={card} />
                <div className="flex items-center justify-between">
                  <Badge variant={card.frozen ? "warning" : card.status === "active" ? "success" : "neutral"}>
                    {card.frozen ? "Frozen" : card.status === "pending" ? "Pending" : card.status === "expired" ? "Expired" : card.status === "closed" ? "Closed" : "Active"}
                  </Badge>
                  <Button
                    variant={card.frozen ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => updateCard(card, { frozen: !card.frozen }, card.frozen ? "Card unfrozen" : "Card frozen")}
                    disabled={busy(card)}
                  >
                    {card.frozen ? <Flame className="size-4" /> : <Snowflake className="size-4" />}
                    {card.frozen ? "Unfreeze" : "Freeze"}
                  </Button>
                </div>

                {/* Spending controls */}
                <div className="grid gap-2 sm:grid-cols-3">
                  <ToggleRow
                    icon={<Globe className="size-4" />}
                    label="Online payments"
                    checked={card.onlineEnabled}
                    disabled={busy(card)}
                    onCheckedChange={(v) => updateCard(card, { online_enabled: v }, v ? "Online payments enabled" : "Online payments disabled")}
                  />
                  <ToggleRow
                    icon={<Banknote className="size-4" />}
                    label="ATM"
                    checked={card.atmEnabled}
                    disabled={busy(card)}
                    onCheckedChange={(v) => updateCard(card, { atm_enabled: v }, v ? "ATM withdrawals enabled" : "ATM withdrawals disabled")}
                  />
                  <ToggleRow
                    icon={<Nfc className="size-4" />}
                    label="Contactless"
                    checked={card.contactlessEnabled}
                    disabled={busy(card)}
                    onCheckedChange={(v) => updateCard(card, { contactless_enabled: v }, v ? "Contactless enabled" : "Contactless disabled")}
                  />
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Daily limit</p>
                    <p className="font-semibold text-navy-100">{card.dailyLimit ? formatMoney(card.dailyLimit, "USD") : "No limit"}</p>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Monthly limit</p>
                    <p className="font-semibold text-navy-100">{card.monthlyLimit ? formatMoney(card.monthlyLimit, "USD") : "No limit"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Expires {formatCardExpiry(card.expMonth, card.expYear)}</p>
                  <EditLimitsDialog card={card} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
