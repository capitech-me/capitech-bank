import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? "";
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3006";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "http://localhost:3002";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // No Supabase configured — allow navigation so demo UI (mock mode) is visible
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
          });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = request.nextUrl.pathname.startsWith("/onboarding") || !request.nextUrl.pathname.startsWith("/sign");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(new URL(url.pathname, LANDING_URL));
  }

  if (user) {
    // Staff belong in the back office
    const { data: profile } = await supabase.from("profiles").select("role").maybeSingle();
    const role = profile?.role;
    if (role && (role.startsWith("staff_") || role === "super_admin")) {
      return NextResponse.redirect(new URL(request.nextUrl.pathname, ADMIN_URL));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
