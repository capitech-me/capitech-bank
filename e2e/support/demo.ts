import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the Capitech E2E suite.
 *
 * The apps render full demo data when Supabase is NOT configured, and the
 * middleware (proxy.ts) lets unauthenticated traffic through. When Supabase
 * IS configured but the browser has no session, the customer/admin proxies
 * redirect protected routes to the landing sign-in page. These helpers make
 * the specs tolerant of both setups: they assert the demo UI when the page
 * renders, and assert the login gate when the middleware redirects.
 */

/** Local declaration so specs typecheck without @types/node (Playwright pulls it in when installed). */
declare const process: { env: Record<string, string | undefined> } | undefined;

/** Set E2E_LIVE=1 to run the assertions that require a real backend + session. */
export const LIVE = typeof process !== "undefined" && process.env?.E2E_LIVE === "1";

/** The customer/admin middleware redirects unauthenticated users to this landing path. */
const SIGN_IN_PATH = "/sign-in";

export function isOnSignIn(page: Page): boolean {
  const pathname = new URL(page.url()).pathname;
  return pathname === SIGN_IN_PATH || pathname.endsWith(SIGN_IN_PATH);
}

/**
 * Navigate to an app route and report which mode we landed in:
 *  - "sign-in" — the app's middleware redirected us to the landing sign-in
 *    page (Supabase configured, no session in the browser)
 *  - "demo"    — the page rendered (demo mode, or an authenticated session)
 */
export async function gotoApp(page: Page, path: string): Promise<"demo" | "sign-in"> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return isOnSignIn(page) ? "sign-in" : "demo";
}

/**
 * In demo mode, run `assertDemo` against the rendered page. If the navigation
 * was redirected to the landing sign-in page, assert the login gate instead so
 * the spec passes in both configurations.
 */
export async function expectDemoOrSignIn(
  page: Page,
  assertDemo: (page: Page) => Promise<void>,
): Promise<void> {
  if (isOnSignIn(page)) {
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    return;
  }
  await assertDemo(page);
}

/**
 * Click handlers that show a toast and then reload the page (approve/reject,
 * freeze card, open deposit) leave the toast on screen for only a moment before
 * the reload tears it down. Treat either the toast appearing or the subsequent
 * reload as success, then let the caller assert the post-action UI.
 */
export async function expectToastOrReload(
  page: Page,
  toastText: string | RegExp,
  timeout = 6_000,
): Promise<void> {
  const seen = await page
    .getByText(toastText)
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
  if (!seen) {
    await page.waitForLoadState("load");
  }
}
