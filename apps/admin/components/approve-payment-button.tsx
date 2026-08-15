"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

export function ApprovePaymentButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase
        .from("payment_orders")
        .update({
          status: action === "approve" ? "authorized" : "rejected",
          approved_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) {
        toast.error(error.message);
        setBusy(null);
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
    // Notify the customer by email (best-effort, never blocks)
    if (isSupabaseConfigured()) {
      fetch("/admin/api/payments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, decision: action }),
      }).catch(() => {});
    }
    toast.success(action === "approve" ? "Payment authorised" : "Payment rejected");
    setBusy(null);
    window.location.reload();
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => decide("reject")} disabled={busy !== null} className="text-red-600">
        <X className="size-4" /> Reject
      </Button>
      <Button size="sm" onClick={() => decide("approve")} disabled={busy !== null}>
        <Check className="size-4" /> Authorise
      </Button>
    </div>
  );
}
