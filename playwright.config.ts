import { defineConfig } from "@playwright/test";

/**
 * Capitech Bank E2E suite.
 *
 * The monorepo runs three Next.js apps side by side:
 *   landing  → http://localhost:3006  (marketing + auth: sign-up/sign-in/MFA)
 *   customer → http://localhost:3001  (front office, basePath /app)
 *   admin    → http://localhost:3002  (back office, basePath /admin)
 *
 * Spec files are routed to the app they exercise via per-project `testMatch`
 * globs. Everything runs against demo mode by default; set E2E_LIVE=1 to run
 * the assertions that need a real Supabase backend + session.
 */
export default defineConfig({
  testDir: "./e2e",
  reporter: "html",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,

  webServer: [
    {
      command: "pnpm dev:landing",
      url: "http://localhost:3006",
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: "pnpm dev:customer",
      // Customer app serves under /app (basePath) — the root URL 404s,
      // which would make Playwright's readiness probe wait forever.
      url: "http://localhost:3001/app",
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: "pnpm dev:admin",
      // Admin app serves under /admin (basePath) — same basePath caveat.
      url: "http://localhost:3002/admin",
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],

  projects: [
    {
      name: "landing",
      testMatch: ["**/auth.spec.ts"],
      use: { baseURL: "http://localhost:3006" },
    },
    {
      name: "customer",
      testMatch: [
        "**/accounts.spec.ts",
        "**/cards.spec.ts",
        "**/crypto.spec.ts",
        "**/deposits.spec.ts",
        "**/onboarding.spec.ts",
        "**/statements.spec.ts",
        "**/transfers.spec.ts",
      ],
      use: { baseURL: "http://localhost:3001" },
    },
    {
      name: "admin",
      testMatch: ["**/openapi.spec.ts", "**/transfers-admin.spec.ts"],
      use: { baseURL: "http://localhost:3002" },
    },
  ],
});
