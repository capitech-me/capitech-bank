"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

export function MarkNotificationsRead() {
  const router = useRouter();

  async function markAll() {
    if (!isSupabaseConfigured()) {
      toast.success("All notifications marked as read");
      return;
    }
    const supabase = getBrowserClient();
    const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
    if (error) toast.error(error.message);
    else toast.success("All notifications marked as read");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={markAll}>
      <CheckCheck className="size-4" /> Mark all read
    </Button>
  );
}
