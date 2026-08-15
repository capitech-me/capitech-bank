"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Logo } from "@capitech/ui";
import { getSupabaseBrowserClient } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <div className="px-6 py-5">
        <Link href="/" aria-label="Back to home">
          <Logo dark />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Reset your password</CardTitle>
              <CardDescription className="text-navy-300">
                Enter your email and we will send you a reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="py-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <p className="mt-4 text-sm text-navy-200">
                    If an account exists for <span className="font-medium">{email}</span>, a reset
                    link is on its way.
                  </p>
                  <Button asChild variant="outline" className="mt-6 border-white/15 bg-transparent text-white hover:bg-white/5">
                    <Link href="/sign-in">Back to sign in</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-navy-100">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="border-white/10 bg-white/5 text-white placeholder:text-navy-500"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive" className="border-red-400/30 bg-red-500/10 text-red-200">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Sending…" : "Send reset link"}
                  </Button>
                  <Button asChild variant="ghost" className="w-full text-navy-300 hover:bg-white/5 hover:text-white">
                    <Link href="/sign-in">
                      <ArrowLeft className="size-4" /> Back to sign in
                    </Link>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
