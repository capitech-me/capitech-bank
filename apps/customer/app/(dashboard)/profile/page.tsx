"use client";

import { useEffect, useState } from "react";
import { Bell, KeyRound, Mail, Phone, ShieldCheck, Smartphone, User, Fingerprint } from "lucide-react";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Switch } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { VerifyButton } from "@/components/didit-verify-button";

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_notifications: boolean;
  tenant_id?: string | null;
}

interface NotificationPrefs {
  email_transactional: boolean;
  email_security: boolean;
  email_marketing: boolean;
  in_app: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_transactional: true,
  email_security: true,
  email_marketing: false,
  in_app: true,
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Notification preferences
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  // KYC state
  const [kycStatus, setKycStatus] = useState<string>("draft");
  const [kycLevel, setKycLevel] = useState<string>("unverified");

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        setProfile({ first_name: "Jane", last_name: "Doe", phone: "+1 555 010 2324", email_notifications: true });
        setEmail("jane.doe@capitech.me");
        setMfaEnabled(true);
        setKycStatus("approved");
        setKycLevel("level_2");
        setLoading(false);
        return;
      }
      const supabase = getBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) setEmail(user.email ?? "");
      const { data: profileData } = await supabase.from("profiles").select("first_name, last_name, phone, email_notifications, tenant_id").maybeSingle();
      if (profileData) {
        setProfile(profileData as ProfileData);
        setTenantId((profileData as ProfileData).tenant_id ?? null);
      }
      // Notification preferences — fall back to defaults when no row exists yet.
      const { data: prefsData } = await supabase.from("notification_prefs").select("email_transactional, email_security, email_marketing, in_app").maybeSingle();
      if (prefsData) setPrefs({ ...DEFAULT_PREFS, ...(prefsData as Partial<NotificationPrefs>) });
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      setMfaEnabled((factorsData?.totp.length ?? 0) > 0);
      const { data: customerData } = await supabase.from("customers").select("kyc_status, kyc_level").maybeSingle();
      if (customerData) {
        setKycStatus(customerData.kyc_status);
        setKycLevel(customerData.kyc_level);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveProfile() {
    if (!profile) return;
    if (isSupabaseConfigured()) {
      const supabase = getBrowserClient();
      const { error } = await supabase.from("profiles").update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        email_notifications: profile.email_notifications,
      });
      if (error) return toast.error(error.message);
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError && emailError.code !== "email_exists") return toast.error(emailError.message);
      toast.success("Profile updated");
    } else {
      await new Promise((r) => setTimeout(r, 500));
      toast.success("Profile updated (demo mode)");
    }
  }

  async function updatePrefs(patch: Partial<NotificationPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setPrefsSaving(true);
    if (!isSupabaseConfigured()) {
      await new Promise((r) => setTimeout(r, 300));
      setPrefsSaving(false);
      toast.success("Notification preferences saved (demo mode)");
      return;
    }
    const supabase = getBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setPrefs(next);
      setPrefsSaving(false);
      toast.error("Unable to identify your account");
      return;
    }
    // tenant_id is required — resolve it from the profile if not already cached.
    let tid = tenantId;
    if (!tid) {
      const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
      tid = (prof?.tenant_id as string | null) ?? null;
      if (tid) setTenantId(tid);
    }
    const payload: Record<string, unknown> = {
      profile_id: userId,
      email_transactional: next.email_transactional,
      email_security: next.email_security,
      email_marketing: next.email_marketing,
      in_app: next.in_app,
    };
    if (tid) payload.tenant_id = tid;
    const { error } = await supabase.from("notification_prefs").upsert(payload, { onConflict: "profile_id" });
    if (error) {
      setPrefs(prefs);
      setPrefsSaving(false);
      toast.error(error.message);
      return;
    }
    setPrefsSaving(false);
    toast.success("Notification preferences saved");
    window.location.reload();
  }

  async function enrollMfa() {
    if (!isSupabaseConfigured()) {
      toast.info("Connect Supabase to enable MFA enrollment");
      return;
    }
    setMfaBusy(true);
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      toast.error(error?.message ?? "Enrollment failed");
      setMfaBusy(false);
      return;
    }
    setMfaFactorId(data.id);
    setMfaQr(data.totp.qr_code);
    setMfaSecret(data.totp.secret);
    setMfaBusy(false);
  }

  async function verifyMfa() {
    if (!mfaFactorId) return;
    setMfaBusy(true);
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
    if (error) {
      toast.error("Invalid code — please try again");
      setMfaBusy(false);
      return;
    }
    toast.success("Two-factor authentication enabled");
    setMfaEnabled(true);
    setMfaQr(null);
    setMfaSecret("");
    setMfaFactorId(null);
    setMfaCode("");
    setMfaBusy(false);
  }

  async function disableMfa() {
    if (!isSupabaseConfigured()) return;
    setMfaBusy(true);
    const supabase = getBrowserClient();
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const factor = factorsData?.totp?.[0];
    if (factor) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        toast.error(error.message);
        setMfaBusy(false);
        return;
      }
    }
    toast.success("Two-factor authentication disabled");
    setMfaEnabled(false);
    setMfaBusy(false);
  }

  async function changePassword() {
    toast.info("Password reset emails are sent via Supabase — use 'Forgot password' from sign-in.");
  }

  if (loading) return <div className="mx-auto max-w-3xl py-10 text-center text-sm text-muted-foreground">Loading profile…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile & Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal details, security and preferences.</p>
      </div>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4 text-brand-400" /> Personal information
          </CardTitle>
          <CardDescription>How we address you and reach you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first">First name</Label>
              <Input id="first" value={profile?.first_name ?? ""} onChange={(e) => setProfile((p) => (p ? { ...p, first_name: e.target.value } : p))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last">Last name</Label>
              <Input id="last" value={profile?.last_name ?? ""} onChange={(e) => setProfile((p) => (p ? { ...p, last_name: e.target.value } : p))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="phone" className="pl-9" value={profile?.phone ?? ""} onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium text-navy-100">Email notifications</p>
              <p className="text-xs text-muted-foreground">Transaction alerts, security notices and statements.</p>
            </div>
            <Switch
              checked={profile?.email_notifications ?? true}
              onCheckedChange={(v) => setProfile((p) => (p ? { ...p, email_notifications: v } : p))}
            />
          </div>
          <Button onClick={saveProfile}>Save changes</Button>
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-brand-400" /> Notification preferences
          </CardTitle>
          <CardDescription>Choose how you hear from us — per email category and in-app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-100">In-app notifications</p>
              <p className="text-xs text-muted-foreground">Alerts inside your dashboard.</p>
            </div>
            <Switch checked={prefs.in_app} disabled={prefsSaving} onCheckedChange={(v) => updatePrefs({ in_app: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-100">Email — Transactional</p>
              <p className="text-xs text-muted-foreground">Transfers, deposits and card activity.</p>
            </div>
            <Switch checked={prefs.email_transactional} disabled={prefsSaving} onCheckedChange={(v) => updatePrefs({ email_transactional: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-100">Email — Security</p>
              <p className="text-xs text-muted-foreground">Login alerts, MFA and KYC updates.</p>
            </div>
            <Switch checked={prefs.email_security} disabled={prefsSaving} onCheckedChange={(v) => updatePrefs({ email_security: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-100">Email — Marketing & news</p>
              <p className="text-xs text-muted-foreground">Product updates, offers and bank news.</p>
            </div>
            <Switch checked={prefs.email_marketing} disabled={prefsSaving} onCheckedChange={(v) => updatePrefs({ email_marketing: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-400" /> Two-factor authentication
          </CardTitle>
          <CardDescription>Add an extra layer of protection with an authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          {mfaEnabled ? (
            <div className="space-y-4">
              <Alert variant="success">
                <AlertDescription className="flex items-center gap-2">
                  <Smartphone className="size-4" /> Two-factor authentication is enabled on your account.
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-between">
                <Badge variant="success">Protected</Badge>
                <Button variant="outline" onClick={disableMfa} disabled={mfaBusy}>
                  Disable MFA
                </Button>
              </div>
            </div>
          ) : mfaQr ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password…) and enter the 6-digit code.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mfaQr} alt="TOTP QR code" className="size-44 rounded-lg border border-border bg-white p-2" />
                <div className="w-full space-y-2 sm:flex-1">
                  <p className="font-mono break-all text-xs text-muted-foreground">Secret: {mfaSecret}</p>
                  <Input inputMode="numeric" maxLength={6} placeholder="6-digit code" className="font-mono text-lg tracking-widest" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))} />
                  <Button className="w-full" onClick={verifyMfa} disabled={mfaBusy || mfaCode.length !== 6}>
                    Verify & enable
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="warning">
                <AlertDescription className="flex items-center gap-2">
                  <KeyRound className="size-4" /> Two-factor authentication is not enabled yet.
                </AlertDescription>
              </Alert>
              <Button onClick={enrollMfa} disabled={mfaBusy}>
                <ShieldCheck className="size-4" /> Enable MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identity verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="size-4 text-brand-400" /> Identity verification
          </CardTitle>
          <CardDescription>Verify your identity with Didit to unlock full account access.</CardDescription>
        </CardHeader>
        <CardContent>
          {kycStatus === "approved" ? (
            <Alert variant="success">
              <AlertDescription className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4" /> Identity verified ({kycLevel})
                </span>
                <Badge variant="success">Approved</Badge>
              </AlertDescription>
            </Alert>
          ) : kycStatus === "pending" ? (
            <Alert variant="info">
              <AlertDescription className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Verification in review — we will notify you by email.
              </AlertDescription>
            </Alert>
          ) : kycStatus === "rejected" ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Verification declined — please re-verify with clear documents.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning">
              <AlertDescription className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Identity not verified yet.
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4">
            <VerifyButton label="Start identity verification" />
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand-400" /> Password
          </CardTitle>
          <CardDescription>Use a strong, unique password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={changePassword}>Change password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
