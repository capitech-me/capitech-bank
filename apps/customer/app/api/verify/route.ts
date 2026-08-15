import { NextResponse } from "next/server";
import { createServerClient } from "@capitech/db";
import { cookies } from "next/headers";

/**
 * Didit KYC — create a verification session server-side.
 * The DIDIT_API_KEY never leaves the server.
 */

// Per-session config — NOT a secret and NOT an env var.
// "Free KYC" workflow from the Didit console.
const WORKFLOW_ID = "29395dea-3494-413e-a9b2-52333b177f79";
const DIDIT_SESSION_URL = "https://verification.didit.me/v3/session/";

export async function POST(req: Request) {
  // 1. Identify the user from YOUR auth session — never trust the browser body.
  const cookieStore = await cookies();
  const supabase = await createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // ignore when called from a Server Component context
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "didit_not_configured" }, { status: 503 });
  }

  // Optional body hints (consent already shown client-side)
  const { language } = await req.json().catch(() => ({}));

  const res = await fetch(DIDIT_SESSION_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: WORKFLOW_ID,
      vendor_data: user.id, // stable internal user id — echoed back on every webhook
      callback: "https://app.capitech.me/onboarding?verified=1",
      ...(typeof language === "string" && language.length === 2 ? { language } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "session_create_failed", detail }, { status: 502 });
  }

  const session = await res.json(); // { session_id, session_token, url, status, ... }
  // Return ONLY what the client needs. session_token is for native SDKs.
  return NextResponse.json({ url: session.url, session_id: session.session_id });
}
