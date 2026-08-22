"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Logo } from "@capitech/ui";
import { getSupabaseBrowserClient, getPostAuthRedirect } from "@/lib/auth";

function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // "Try demo" — /sign-in?demo=1 fills the demo credentials and signs in.
  // A ref flag guarantees it only fires once. The sign-in uses the literal
  // demo credentials directly (bypassing the stale-closure state problem),
  // then forwards to the customer app (customer role -> /app).
  const demoHandled = useRef(false);
  useEffect(() => {
    if (searchParams.get("demo") !== "1" || demoHandled.current) return;
    demoHandled.current = true;
    const t = setTimeout(async () => {
      // Fill the visible inputs for the user to see, then sign in directly.
      setEmail("jane@capitech.me");
      setPassword("CapitechJane2026!");
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: "jane@capitech.me",
        password: "CapitechJane2026!",
      });
      if (!signInError && data.session) {
        const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ?? "http://localhost:3001";
        window.location.href = customerUrl;
      }
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Self-heal: the customer/admin apps redirect unauthenticated visitors back
  // to /sign-in. If the session cookie hasn't propagated yet when that
  // bounce happens (multi-zone rewrite race), re-detect the session here and
  // forward the already-signed-in user to their app instead of stranding them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabaseConfigured) return;
      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled || !userData.user) return;
      let role: string | null = null;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .maybeSingle();
        role = profile?.role ?? null;
      } catch {
        // table may not exist yet — treat as customer
      }
      window.location.href = getPostAuthRedirect(role);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseConfigured]);

  async function handlePasswordSignIn() {
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "Incorrect email or password." : signInError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      await redirectToApp();
      return;
    }

    // No session + user present => MFA required
    if (data.user) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];
      if (totpFactor) {
        setFactorId(totpFactor.id);
        setLoading(false);
        return; // show MFA step
      }
    }
    setError("Please check your email to confirm your account before signing in.");
    setLoading(false);
  }

  async function handleMfaVerify() {
    if (!factorId) return;
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: mfaCode });
    if (verifyError) {
      setError("Invalid verification code. Please try again.");
      setLoading(false);
      return;
    }
    await redirectToApp();
  }

  async function redirectToApp() {
    const supabase = getSupabaseBrowserClient();
    let role: string | null = null;
    try {
      // Scope the profile lookup to the signed-in user. Staff RLS lets them
      // read every profile, so an unfiltered maybeSingle() returns multiple
      // rows and throws — which used to fall through to the customer app.
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .maybeSingle();
        role = profile?.role ?? null;
      }
    } catch {
      // table may not exist yet — treat as customer
    }
    window.location.href = getPostAuthRedirect(role);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (factorId) {
      await handleMfaVerify();
    } else {
      await handlePasswordSignIn();
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Back to home">
          <Logo dark />
        </Link>
        <span className="hidden text-sm text-navy-400 sm:block">
          New to Capitech?{" "}
          <Link href="/sign-up" className="font-medium text-brand-300 hover:text-brand-200">
            Open an account
          </Link>
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
              <CardDescription className="text-navy-300">
                Sign in to your Capitech Bank account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!supabaseConfigured && (
                <Alert variant="warning" className="mb-4">
                  <AlertTitle>Supabase not configured</AlertTitle>
                  <AlertDescription>
                    Add your <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                    <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                    <code className="font-mono">apps/landing/.env.local</code> to enable authentication.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-navy-100">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-navy-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-navy-100">
                      Password
                    </Label>
                    <Link href="/auth/forgot-password" className="text-xs text-brand-300 hover:text-brand-200">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-navy-500"
                    />
                  </div>
                </div>

                {factorId && (
                  <div className="space-y-2">
                    <Label htmlFor="mfa" className="text-navy-100">
                      Two-factor code
                    </Label>
                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-300" />
                      <Input
                        id="mfa"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                        required
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                        className="border-white/10 bg-white/5 pl-9 font-mono text-lg tracking-widest text-white placeholder:text-navy-500"
                      />
                    </div>
                    <p className="text-xs text-navy-400">
                      Enter the 6-digit code from your authenticator app.
                    </p>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive" className="border-red-400/30 bg-red-500/10 text-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" size="lg" className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500" disabled={loading || !supabaseConfigured}>
                  {loading ? "Signing in…" : factorId ? "Verify code" : "Sign in"}
                  {!loading && <ArrowRight className="size-4" />}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-3">
                <Badge variant="neutral" className="border-white/10 bg-white/5 text-navy-300">
                  <ShieldCheck className="size-3" /> Protected by MFA
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
