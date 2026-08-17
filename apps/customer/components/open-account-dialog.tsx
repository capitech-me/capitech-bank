"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { getBrowserClient } from "@/lib/supabase-browser";

function OpenAccountDialogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState("prod-current");
  const [currency, setCurrency] = useState("USD");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const syncOpenFromUrl = () => {
      if (searchParams.get("open") === "1") setOpen(true);
    };
    syncOpenFromUrl();
  }, [searchParams]);

  async function handleCreate() {
    setLoading(true);
    const supabase = getBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      setLoading(false);
      return;
    }
    const { data: customer } = await supabase.from("customers").select("id").maybeSingle();
    if (!customer) {
      toast.info("Complete onboarding to open accounts");
      router.push("/onboarding");
      setLoading(false);
      return;
    }
    const { error } = await supabase.rpc("open_account", {
      p_owner_type: "customer",
      p_owner_id: customer.id,
      p_product_id: product,
      p_currency: currency,
      p_nickname: nickname || null,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("Account opened successfully");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Open account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a new account</DialogTitle>
          <DialogDescription>Choose a product and currency. Your account number and IBAN are generated automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prod-current">Multi-Currency Current</SelectItem>
                <SelectItem value="prod-savings">Savings Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "AED", "SAR", "JPY", "CHF", "CAD", "AUD", "SGD", "NGN", "ZAR"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Travel, Business" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Opening…" : "Open account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OpenAccountDialog() {
  return (
    <Suspense fallback={<Button><Plus className="size-4" /> Open account</Button>}>
      <OpenAccountDialogInner />
    </Suspense>
  );
}
