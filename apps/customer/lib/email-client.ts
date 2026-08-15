"use client";

/** Fire-and-forget transactional email from client actions (never blocks the UI). */
export async function sendClientEmail(type: string, data: Record<string, unknown> = {}) {
  try {
    await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...data }),
    });
  } catch {
    // emails are best-effort — never break the user action
  }
}
