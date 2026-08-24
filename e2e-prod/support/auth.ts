import { expect, type Page } from "@playwright/test";

/**
 * Authentication helpers for the production suite.
 *
 * The customer (/app) and admin (/admin) proxies redirect unauthenticated
 * visitors to the landing /sign-in page. All protected specs must authenticate
 * first via these helpers. They are idempotent: if a session already exists the
 * caller is left on their app instead of being bounced through the login form.
 */

export const CUSTOMER_EMAIL = "jane@capitech.me";
export const CUSTOMER_PASSWORD = "CapitechJane2026!";

export const ADMIN_EMAIL = "admin@capitech.me";
export const ADMIN_PASSWORD = "CapitechAdmin2026!";

const SIGN_IN_PATH = "/sign-in";

/** Rough check: does a URL pathname belong to a protected app? */
function isAppPathname(url: URL): boolean {
  const pathname = url.pathname;
  return pathname.startsWith("/app") || pathname.startsWith("/admin");
}

/**
 * Sign in with real Supabase credentials and land on `expectedPath`.
 *
 * Steps:
 *   1. goto /sign-in
 *   2. if a session already exists the landing proxy forwards auth pages away,
 *      leaving us on /app or /admin — bail out gracefully.
 *   3. otherwise fill the form and submit, then wait for the post-auth redirect.
 *   4. on a redirect race (the session cookie lands just after the bounce) fall
 *      back to an explicit navigation — the session is now valid.
 */
async function signIn(page: Page, email: string, password: string, expectedPath: string): Promise<void> {
  await page.goto(SIGN_IN_PATH, { waitUntil: "domcontentloaded" });

  // Guard: already signed in → the landing proxy forwards auth pages away.
  if (isAppPathname(new URL(page.url()))) {
    return;
  }

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  const emailInput = page.getByLabel("Email");
  const passwordInput = page.getByLabel("Password");
  const submit = page.getByRole("button", { name: "Sign in" });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(submit).toBeEnabled();
  await submit.click();

  try {
    await page.waitForURL((url) => url.pathname.startsWith(expectedPath), { timeout: 30_000 });
  } catch {
    // Redirect race / self-heal: the session is now valid, force the navigation.
    await page.goto(expectedPath, { waitUntil: "domcontentloaded" });
  }

  // Confirm we actually landed on the protected app (surfaces bad credentials).
  await expect(page).toHaveURL(new RegExp(expectedPath));
}

/** Sign in as the seeded customer and land on /app. */
export async function loginAsCustomer(page: Page): Promise<void> {
  await signIn(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD, "/app");
}

/** Sign in as the seeded admin and land on /admin. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD, "/admin");
}
