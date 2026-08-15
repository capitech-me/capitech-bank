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
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
    toast.success(action === "approve" ? "Application approved" : "Application rejected");
    setBusy(null);
    window.location.reload();
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => decide("reject")} disabled={busy !== null} className="text-red-600">
        <X className="size-4" /> Reject
      </Button>
      <Button size="sm" onClick={() => decide("approve")} disabled={busy !== null}>
        <Check className="size-4" /> Approve
      </Button>
    </div>
  );
}
