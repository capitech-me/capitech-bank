import { NextResponse } from "next/server";
import { createServerClient, withRateLimit } from "@capitech/db";
import { cookies } from "next/headers";
import {
  cardEmail,
  depositEmail,
  emailDate,
  sendEmail,
  transferEmail,
  welcomeEmail,
} from "@capitech/email";

/**
 * Transactional email dispatcher (customer app).
 * Authenticated by the user's session — a user can only email THEMSELVES,
 * and only with allow-listed template types. No arbitrary content.
 */

const ALLOWED_TYPES = [
  "welcome",
  "transfer_sent",
  "transfer_received",
  "card_created",
  "deposit_opened",
] as const;

type EmailType = (typeof ALLOWED_TYPES)[number];

// Email delivery costs money — cap abuse per IP (S-7).
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const limited = withRateLimit(req, RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  const cookieStore = await cookies();
  const supabase = await createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // ignore
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  const firstName = profile?.first_name ?? user.user_metadata?.first_name ?? "there";

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const type = body.type as EmailType;
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  let subject = "";
  let html = "";

  switch (type) {
    case "welcome":
      subject = "Welcome to Capitech Bank";
      html = welcomeEmail({ firstName });
      break;
    case "transfer_sent":
    case "transfer_received":
      subject = `Capitech Bank — transfer ${type === "transfer_sent" ? "sent" : "received"}`;
      html = transferEmail({
        direction: type === "transfer_sent" ? "sent" : "received",
        firstName,
        amount: String(body.amount ?? "—"),
        currency: String(body.currency ?? ""),
        counterparty: String(body.counterparty ?? "Capitech Bank"),
        reference: String(body.reference ?? "—"),
        date: emailDate(new Date()),
      });
      break;
    case "card_created":
      subject = "Your new virtual card";
      html = cardEmail({
        firstName,
        last4: String(body.last4 ?? "••••"),
        brand: String(body.brand ?? "visa"),
      });
      break;
    case "deposit_opened":
      subject = "Term deposit opened";
      html = depositEmail({
        firstName,
        principal: String(body.principal ?? "—"),
        currency: String(body.currency ?? ""),
        rate: String(body.rate ?? "—"),
        termDays: Number(body.termDays ?? 0),
        maturityDate: String(body.maturityDate ?? "—"),
      });
      break;
  }

  const result = await sendEmail({ to: email, subject, html });
  if (!result.ok) {
    // Graceful: email infra not configured or failed — never break the user action.
    return NextResponse.json({ ok: false, error: result.error ?? "send_failed" }, { status: 200 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
