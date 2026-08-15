"use client";

import { useState } from "react";
import { CreditCard, Plus, Snowflake, Flame, Globe } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@capitech/ui";
import { formatMoney, formatCardExpiry } from "@capitech/lib";
import { toast } from "@capitech/ui";
import { cn } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
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
      const { data: { user } } = await supabase.auth.getUser();
      const last4 = Math.floor(1000 + Math.random() * 9000).toString();
      const { error } = await supabase.from("cards").insert({
        account_id: accountId,
        brand,
        last4,
        token: `tok_${Math.random().toString(36).slice(2)}`,
        exp_month: new Date().getMonth() + 1,
        exp_year: new Date().getFullYear() + 5,
        status: "active",
        name_on_card: nameOnCard.toUpperCase(),
        daily_limit: dailyLimit,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Virtual card created");
      setOpen(false);
      window.location.reload();
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Virtual card created");
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

export function CardsManager({ cards, defaultAccountId }: { cards: CardVM[]; defaultAccountId: string }) {
  const [freezing, setFreezing] = useState<string | null>(null);

  async function toggleFreeze(card: CardVM) {
    setFreezing(card.id);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("cards").update({ frozen: !card.frozen }).eq("id", card.id);
      if (error) toast.error(error.message);
      else toast.success(card.frozen ? "Card unfrozen" : "Card frozen");
    } else {
      await new Promise((r) => setTimeout(r, 400));
      toast.success(card.frozen ? "Card unfrozen" : "Card frozen");
    }
    setFreezing(null);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Virtual cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, control and freeze cards in seconds.</p>
        </div>
        <CreateCardDialog accountId={defaultAccountId} />
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CreditCard className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-navy-950">No cards yet</h3>
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
                  <Badge variant={card.frozen ? "warning" : "success"}>
                    {card.frozen ? "Frozen" : "Active"}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="size-3.5" /> Online
                      <Switch checked={card.onlineEnabled} onCheckedChange={() => toast.info("Card controls update in Phase 2")} />
                    </span>
                    <Button
                      variant={card.frozen ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => toggleFreeze(card)}
                      disabled={freezing === card.id}
                    >
                      {card.frozen ? <Flame className="size-4" /> : <Snowflake className="size-4" />}
                      {card.frozen ? "Unfreeze" : "Freeze"}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Daily limit</p>
                    <p className="font-semibold text-navy-950">{card.dailyLimit ? formatMoney(card.dailyLimit, "USD") : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Expiry</p>
                    <p className="font-semibold text-navy-950">{formatCardExpiry(card.expMonth, card.expYear)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
