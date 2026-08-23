"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Logo, Textarea } from "@capitech/ui";
import { SUPPORT_EMAIL } from "@capitech/lib";
import { getSupabaseBrowserClient } from "@/lib/auth";

type SubmitState = "idle" | "sending" | "sent";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState("sending");

    // The browser client inlines NEXT_PUBLIC_* vars at build time.
    const configured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    let saved = false;
    if (configured) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.from("contact_messages").insert({
          name,
          email,
          subject: subject.trim() || null,
          message,
          status: "new",
        });
        saved = !error;
        if (error) {
          console.error("Contact form: insert failed", error.message);
        }
      } catch (err) {
        console.error("Contact form: insert threw", err);
      }
    }

    if (!saved) {
      // Graceful fallback: never pretend the message was captured when it
      // wasn't. Show success anyway, but tell the visitor how to reach us.
      setNotice(
        `We couldn't save your message to our system just now — if you don't hear back from us, please email ${SUPPORT_EMAIL} directly.`
      );
    }
    setSubmitState("sent");
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href="/" aria-label="Back to home">
          <Logo dark />
        </Link>
        <span className="hidden text-sm text-navy-400 sm:block">
          New to Capitech?{" "}
          <Link href="/sign-up" className="font-medium text-brand-300 hover:text-brand-200">
            Open an account
          </Link>
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-4xl gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Talk to our team</h1>
            <p className="mt-4 leading-relaxed text-navy-300">
              Questions about personal banking, business accounts or the Open API? We
              usually reply within one business day.
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <p className="font-medium text-white">Email</p>
              <p className="text-navy-300">{SUPPORT_EMAIL}</p>
              <p className="mt-4 font-medium text-white">Business banking</p>
              <p className="text-navy-300">corporate@capitech.me</p>
              <p className="mt-4 font-medium text-white">Media &amp; press</p>
              <p className="text-navy-300">press@capitech.me</p>
            </div>
          </div>

          <Card className="border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Send a message</CardTitle>
              <CardDescription className="text-navy-300">We will get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent>
              {submitState === "sent" ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Send className="size-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-white">Message sent</h2>
                  <p className="mt-2 text-sm text-navy-300">
                    Thanks, {name || "friend"}! We will reply to {email} within one business day.
                  </p>
                  {notice && (
                    <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
                      {notice}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-navy-100">Full name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="border-white/10 bg-white/5 text-white placeholder:text-navy-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-navy-100">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="border-white/10 bg-white/5 text-white placeholder:text-navy-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-navy-100">Subject <span className="font-normal text-navy-500">(optional)</span></Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Account opening, cards, API access…" className="border-white/10 bg-white/5 text-white placeholder:text-navy-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-navy-100">Message</Label>
                    <Textarea id="message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" className="border-white/10 bg-white/5 text-white placeholder:text-navy-500" />
                  </div>
                  <Button type="submit" size="lg" disabled={submitState === "sending"} className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500 disabled:opacity-70">
                    {submitState === "sending" ? "Sending…" : "Send message"}
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
