"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { formatPercent, humanize } from "@capitech/lib";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

/* ============================================================
   Product editor — full CRUD over the `products` table.
   Schema (20260815000004):
     id, tenant_id, code, name, description,
     product_type in (current, savings, term_deposit, crypto, multi_currency),
     currency char(3) nullable (null = multi-currency),
     interest_rate numeric(9,4) nullable, monthly_fee numeric(20,2) nullable,
     status in (active, inactive), created_at, updated_at,
     unique (tenant_id, code)
   ============================================================ */

const PRODUCT_TYPES = [
  { value: "current", label: "Current" },
  { value: "savings", label: "Savings" },
  { value: "term_deposit", label: "Term Deposit" },
  { value: "crypto", label: "Crypto" },
  { value: "multi_currency", label: "Multi-Currency" },
] as const;

// Common bankable currencies (fiat). Blank option = multi-currency product.
const CURRENCY_OPTIONS = ["AED", "AUD", "BHD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "INR", "JPY", "KWD", "NGN", "OMR", "QAR", "SAR", "SGD", "TRY", "USD"];
const MULTI_SENTINEL = "__multi__";

interface ProductRecord {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  product_type: string;
  currency: string | null;
  interest_rate: string | null;
  monthly_fee: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProductForm {
  code: string;
  name: string;
  description: string;
  currency: string;
  product_type: string;
  interest_rate: string;
  status: string;
}

const emptyForm = (): ProductForm => ({
  code: "",
  name: "",
  description: "",
  currency: MULTI_SENTINEL,
  product_type: "current",
  interest_rate: "",
  status: "active",
});

const DEMO_PRODUCTS: ProductRecord[] = [
  { id: "p-1", tenant_id: "t-1", code: "CUR_MULTI", name: "Multi-Currency Current", description: "Everyday account in 30+ currencies with instant transfers.", product_type: "current", currency: null, interest_rate: null, monthly_fee: "0", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-2", tenant_id: "t-1", code: "SAV_USD", name: "Savings Plus (USD)", description: "High-yield savings with daily interest accrual.", product_type: "savings", currency: "USD", interest_rate: "3.50", monthly_fee: "0", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-3", tenant_id: "t-1", code: "SAV_EUR", name: "Savings Plus (EUR)", description: "High-yield euro savings with daily interest accrual.", product_type: "savings", currency: "EUR", interest_rate: "2.75", monthly_fee: "0", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-4", tenant_id: "t-1", code: "TD_USD", name: "Fixed Term Deposit (USD)", description: "Fixed-rate term deposits from 7 days.", product_type: "term_deposit", currency: "USD", interest_rate: "4.25", monthly_fee: null, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-5", tenant_id: "t-1", code: "TD_EUR", name: "Fixed Term Deposit (EUR)", description: "Fixed-rate euro term deposits from 7 days.", product_type: "term_deposit", currency: "EUR", interest_rate: "3.10", monthly_fee: null, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-6", tenant_id: "t-1", code: "CORP_USD", name: "Corporate Current", description: "Corporate operating account with maker–checker approvals.", product_type: "current", currency: "USD", interest_rate: null, monthly_fee: "49", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

async function fetchProducts(): Promise<ProductRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_PRODUCTS;
  const supabase = getBrowserClient();
  const { data, error } = await supabase.from("products").select("*").order("code");
  if (error) {
    toast.error(error.message);
    return [];
  }
  return (data ?? []) as ProductRecord[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchProducts();
      if (!cancelled) setProducts(list);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: ProductRecord) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description ?? "",
      currency: p.currency ?? MULTI_SENTINEL,
      product_type: p.product_type,
      interest_rate: p.interest_rate ?? "",
      status: p.status,
    });
    setDialogOpen(true);
  }

  async function saveProduct() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);

    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        currency: form.currency === MULTI_SENTINEL ? null : form.currency,
        product_type: form.product_type,
        interest_rate: form.interest_rate === "" ? null : Number(form.interest_rate),
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) {
          toast.error(error.message);
          setSaving(false);
          return;
        }
      } else {
        // Resolve the tenant for the new product from the signed-in user's profile.
        const { data: userData } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", userData.user?.id)
          .maybeSingle();
        const tenantId = profile?.tenant_id;
        if (!tenantId) {
          toast.error("Could not resolve your tenant");
          setSaving(false);
          return;
        }
        const { error } = await supabase.from("products").insert({ ...payload, tenant_id: tenantId });
        if (error) {
          toast.error(error.message);
          setSaving(false);
          return;
        }
      }
    } else {
      // Demo mode — simulate latency, success is implied.
      await new Promise((r) => setTimeout(r, 500));
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success(editing ? "Product updated" : "Product created");
    window.location.reload();
  }

  async function toggleStatus(p: ProductRecord) {
    const nextStatus = p.status === "active" ? "inactive" : "active";
    setBusyId(p.id);

    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("products").update({ status: nextStatus }).eq("id", p.id);
      if (error) {
        toast.error(error.message);
        setBusyId(null);
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }

    setBusyId(null);
    toast.success(nextStatus === "active" ? "Product activated" : "Product deactivated");
    window.location.reload();
  }

  const fieldInput = "border-white/10 bg-white/5 text-white";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Banking products available to customers.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
              <DialogDescription>
                {editing ? `Update ${editing.code} — the current rates and limits apply immediately.` : "Create a banking product. Leave currency blank for a multi-currency product."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAV_USD" className={fieldInput} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className={`w-full ${fieldInput}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Savings Plus (USD)" className={fieldInput} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="High-yield savings with daily interest accrual." className={fieldInput} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product type</Label>
                  <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                    <SelectTrigger className={`w-full ${fieldInput}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className={`w-full ${fieldInput}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MULTI_SENTINEL}>Multi-currency (all)</SelectItem>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Interest rate (% p.a.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                  placeholder="3.50 — leave blank if not applicable"
                  className={fieldInput}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={saveProduct} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                {editing ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <Badge variant="info" className="font-mono">{p.code}</Badge>
                <Badge variant={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
              </div>

              <h3 className="mt-3 font-semibold text-white">{p.name}</h3>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                {humanize(p.product_type)}
                {p.currency ? ` · ${p.currency}` : " · Multi-currency"}
              </p>

              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
                {p.description || "No description."}
              </p>

              <div className="mt-4 space-y-1.5 text-sm">
                {p.interest_rate != null && (
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Interest rate</span>
                    <span className="font-medium text-navy-100">{formatPercent(Number(p.interest_rate))}</span>
                  </p>
                )}
                {p.monthly_fee != null && (
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Monthly fee</span>
                    <span className="font-medium text-navy-100">
                      {Number(p.monthly_fee) === 0 ? "Free" : p.monthly_fee}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId !== null}
                  onClick={() => toggleStatus(p)}
                  className={p.status === "active" ? "text-rose-400" : "text-emerald-400"}
                >
                  {busyId === p.id ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
                  {p.status === "active" ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
