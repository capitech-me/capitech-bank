"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

export function ApproveKycButton({ itemId }: { itemId: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase
        .from("customers")
        .update({ kyc_status: action === "approve" ? "approved" : "rejected", kyc_level: action === "approve" ? "level_2" : "unverified" })
        .eq("id", itemId);
      if (error) {
        toast.error(error.message);
        setBusy(null);
        return;
      }

      // Approval also activates the customer's accounts so they can bank.
      // customers has no status column, so we flip their accounts (created
      // "pending" by open_account) to "active".
      if (action === "approve") {
        const { data: accounts, error: accountsError } = await supabase
          .from("accounts")
          .select("id")
          .eq("owner_type", "customer")
          .eq("owner_id", itemId)
          .neq("status", "active");
        if (accountsError) {
          toast.error(accountsError.message);
          setBusy(null);
          return;
        }
        if (accounts && accounts.length > 0) {
          const { error: activateError } = await supabase
            .from("accounts")
            .update({ status: "active" })
            .in("id", accounts.map((a) => a.id));
          if (activateError) {
            toast.error(activateError.message);
            setBusy(null);
            return;
          }
        }
      }
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
    toast.success(action === "approve" ? "Application approved" : "Application rejected");
    setBusy(null);
    window.location.reload();
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => decide("reject")} disabled={busy !== null} className="text-rose-400">
        <X className="size-4" /> Reject
      </Button>
      <Button size="sm" onClick={() => decide("approve")} disabled={busy !== null}>
        <Check className="size-4" /> Approve
      </Button>
    </div>
  );
}
