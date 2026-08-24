import { defineConfig } from "@playwright/test";

/**
 * Capitech Bank — PRODUCTION regression suite.
 *
 * Runs against the LIVE deployment (https://online.capitech.me) rather than the
 * local demo servers. There is intentionally NO webServer here: production is
 * already live. Every spec authenticates against real Supabase first (see
 * e2e-prod/support/auth.ts) because the customer (/app) and admin (/admin)
 * proxies redirect unauthenticated traffic to the landing /sign-in page.
 *
 * This config is fully separate from playwright.config.ts (the local demo
 * suite) — that file must remain untouched.
 */
export default defineConfig({
  testDir: "./e2e-prod",
  reporter: "list",
  outputDir: "test-results/prod",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,

  // No webServer: the deployment is live.

  projects: [
    {
      name: "production",
      testMatch: ["**/*.spec.ts"],
      use: {
        baseURL: "https://online.capitech.me",
      },
    },
  ],
});
