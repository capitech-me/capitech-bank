"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Logo, Textarea } from "@capitech/ui";
import { SUPPORT_EMAIL } from "@capitech/lib";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
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
              {sent ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Send className="size-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-white">Message sent</h2>
                  <p className="mt-2 text-sm text-navy-300">
                    Thanks, {name || "friend"}! We will reply to {email} shortly.
                  </p>
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
                    <Label htmlFor="message" className="text-navy-100">Message</Label>
                    <Textarea id="message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" className="border-white/10 bg-white/5 text-white placeholder:text-navy-500" />
                  </div>
                  <Button type="submit" size="lg" className="w-full bg-brand-600 text-white shadow-sm hover:bg-brand-500">
                    Send message
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
