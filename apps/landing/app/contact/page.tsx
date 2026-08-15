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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <Link href="/" aria-label="Back to home">
          <Logo />
        </Link>
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-4xl gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy-950">Talk to our team</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Questions about personal banking, corporate accounts or the Open API? We
              usually reply within one business day.
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <p className="font-medium text-navy-950">Email</p>
              <p className="text-muted-foreground">{SUPPORT_EMAIL}</p>
              <p className="mt-4 font-medium text-navy-950">Business banking</p>
              <p className="text-muted-foreground">corporate@capitech.me</p>
              <p className="mt-4 font-medium text-navy-950">Media & press</p>
              <p className="text-muted-foreground">press@capitech.me</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send a message</CardTitle>
              <CardDescription>We will get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Send className="size-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-navy-950">Message sent</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Thanks, {name || "friend"}! We will reply to {email} shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" />
                  </div>
                  <Button type="submit" size="lg" className="w-full">
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
