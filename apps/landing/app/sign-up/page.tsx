"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Mail, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Logo, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@capitech/ui";
import { getSupabaseBrowserClient } from "@/lib/auth";
import { COUNTRIES } from "@capitech/lib";
import { cn } from "@capitech/ui";

function SignUpForm() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "corporate" ? "corporate" : "retail";

  const [accountType, setAccountType] = useState<"retail" | "corporate">(initialType);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
        data: {
          first_name: firstName,
          last_name: lastName,
          account_type: accountType,
          country,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
        <CardContent className="pt-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">Check your inbox</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-300">
            We sent a confirmation link to <span className="font-medium text-white">{email}</span>.
            Click it to activate your account and complete onboarding.
          </p>
          <Button asChild variant="outline" className="mt-7 border-white/15 bg-transparent text-white hover:bg-white/5">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Open your account</CardTitle>
        <CardDescription className="text-navy-300">
          Takes about 2 minutes. Free forever on the standard plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!supabaseConfigured && (
          <Alert variant="warning" className="mb-4">
            <AlertTitle>Supabase not configured</AlertTitle>
            <AlertDescription>
              Add your <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
              <code className="font-mono">apps/landing/.env.local</code> to enable sign-up.
            </AlertDescription>
          </Alert>
        )}

        {/* Account type selector */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {(["retail", "corporate"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors",
                accountType === type
                  ? "border-brand-400 bg-brand-600/20 text-white"
                  : "border-white/10 bg-white/5 text-navy-300 hover:border-white/20"
              )}
            >
              {type === "retail" ? <User className="size-5" /> : <Building2 className="size-5" />}
              {type === "retail" ? "Personal" : "Business / Corporate"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-navy-100">First name</Label>
              <Input
                id="firstName"
                required
                autoComplete="given-name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-navy-100">Last name</Label>
              <Input
                id="lastName"
                required
                autoComplete="family-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-navy-100">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-navy-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-navy-100">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
            />
            <p className="text-xs text-navy-400">Use 8+ characters with letters and numbers.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-navy-100">Country of residence</Label>
            <Select value={country} onValueChange={setCountry} required>
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.alpha2} value={c.alpha2}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-start gap-3 text-sm text-navy-300">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 size-4 rounded border-white/20 bg-white/5 accent-brand-500"
            />
            <span>
              I agree to the{" "}
              <Link href="#" className="text-brand-300 hover:underline">Terms of Service</Link> and{" "}
              <Link href="#" className="text-brand-300 hover:underline">Privacy Policy</Link>, and consent
              to identity verification for KYC purposes.
            </span>
          </label>

          {error && (
            <Alert variant="destructive" className="border-red-400/30 bg-red-500/10 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading || !acceptTerms || !supabaseConfigured}>
            {loading ? "Creating account…" : "Create account"}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-navy-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Back to home">
          <Logo dark />
        </Link>
        <Badge variant="neutral" className="hidden border-white/10 bg-white/5 text-navy-300 sm:inline-flex">
          KYC-compliant onboarding
        </Badge>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <Suspense>
            <SignUpForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
