/**
 * Capitech Bank — email client (Resend).
 * Server-only. Sends are a graceful no-op when RESEND_API_KEY is not configured
 * (dev/demo mode), so the rest of the app never depends on email being live.
 */

import { Resend } from "resend";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "Capitech Bank <no-reply@capitech.me>";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not configured — skipping "${input.subject}" to ${input.to}`);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** Human-friendly date for email bodies. */
export function emailDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
