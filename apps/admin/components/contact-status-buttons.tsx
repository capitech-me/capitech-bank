"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

export function ContactStatusButtons({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState<"responded" | "closed" | null>(null);

  async function setStatus(next: "responded" | "closed") {
    setBusy(next);
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: next })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        setBusy(null);
        return;
      }
    } else {
      // Demo mode — simulate the round trip so the UX is still testable.
      await new Promise((r) => setTimeout(r, 400));
    }
    toast.success(next === "responded" ? "Marked as responded" : "Message closed");
    setBusy(null);
    window.location.reload();
  }

  return (
    <div className="flex justify-end gap-2">
      {status === "new" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("responded")}
          disabled={busy !== null}
        >
          <Check className="size-4" /> Responded
        </Button>
      )}
      {status !== "closed" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("closed")}
          disabled={busy !== null}
          className="text-muted-foreground"
        >
          <X className="size-4" /> Close
        </Button>
      )}
    </div>
  );
}
