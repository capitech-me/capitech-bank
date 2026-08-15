"use client";

import { useState } from "react";
import { ShieldCheck, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { DiditSdk } from "@didit-protocol/sdk-web";

/**
 * Didit KYC verification trigger.
 * Shows consent/disclosure first, then opens the hosted verification flow.
 * The webhook (not this callback) is the source of truth for the decision.
 */

interface VerifyButtonProps {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "lg" | "sm";
  className?: string;
  label?: string;
}

export function VerifyButton({
  variant = "default",
  size = "default",
  className,
  label = "Verify my identity",
}: VerifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  async function startVerification() {
    if (!consent) {
      toast.error("Please accept the verification disclosure first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error === "unauthorized" ? "Please sign in first" : "Could not start verification. Try again.");
        setLoading(false);
        return;
      }
      const { url } = await res.json();

      DiditSdk.shared.onComplete = (result) => {
        // UI hint only — the webhook is authoritative for the decision.
        if (result.type === "completed") {
          toast.success("Verification submitted — we will notify you once it is reviewed.");
        } else if (result.type === "cancelled") {
          toast.info("Verification cancelled");
        } else {
          toast.error(result.error?.message ?? "Verification could not be completed");
        }
      };
      DiditSdk.shared.startVerification({ url }); // opens the Didit modal
    } catch {
      toast.error("Could not start verification. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 rounded border-border accent-brand-600"
        />
        <span>
          I consent to <span className="font-medium text-navy-950">Capitech Bank</span> and its
          verification partner <span className="font-medium text-navy-950">Didit</span> collecting
          and processing my identity documents, biometric data and device information to verify my
          identity (KYC), screen against sanctions and PEP lists, and prevent fraud. Data is
          processed in line with our{" "}
          <span className="underline">Privacy Policy</span> and applicable data protection law.
        </span>
      </label>

      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={startVerification}
        disabled={loading || !consent}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
        {loading ? "Opening secure flow…" : label}
      </Button>
    </div>
  );
}

/** Static status chip for display only. */
export function VerifyStatusChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <ShieldCheck className="size-3.5" /> Verified
    </span>
  );
}
