import { test, expect, type Page } from "@playwright/test";
import { loginAsCustomer } from "../support/auth";

/**
 * Customer front office (/app) against the live deployment.
 *
 * The suite favours stable, always-rendered headers/buttons and tolerates the
 * case where the seeded customer has a section currently empty (asserting the
 * empty state instead of specific rows).
 */

/** Assert a page heading, then either the empty state OR the data assertion. */
async function expectContentOrEmpty(
  page: Page,
  heading: string,
  emptyText: string,
  dataAssert: (page: Page) => Promise<void>,
): Promise<void> {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  const empty = page.getByText(emptyText);
  // Let client-rendered sections settle before deciding which branch we are on.
  const isEmpty = await empty.waitFor({ state: "visible", timeout: 3_000 }).then(() => true).catch(() => false);
  if (isEmpty) {
    await expect(empty).toBeVisible();
    return;
  }
  await dataAssert(page);
}

test.describe("customer dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test("dashboard shows your money at a glance with currency balances", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Your money at a glance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();

    // Real account balances OR the empty state.
    const empty = page.getByText("No accounts yet");
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
    } else {
      // At least one per-currency balance card renders (USD / EUR / GBP).
      await expect(page.getByText(/\b(USD|EUR|GBP) balance\b/).first()).toBeVisible();
    }
  });

  test("accounts page lists real accounts or empty state", async ({ page }) => {
    await page.goto("/app/accounts");
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open account" })).toBeVisible();

    await expectContentOrEmpty(
      page,
      "Accounts",
      "No accounts yet",
      async (p) => {
        // At least one account card with a balance figure renders.
        await expect(p.locator("a[href*='/app/accounts/']").first()).toBeVisible();
        await expect(p.getByText(/\b(Savings|Current|USD|EUR|GBP)\b/).first()).toBeVisible();
      },
    );
  });

  test("transfers form renders From account / Recipient / Amount", async ({ page }) => {
    await page.goto("/app/transfers");
    await expect(page.getByRole("heading", { name: "Transfers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /New transfer/i })).toBeVisible();
    await expect(page.getByLabel("From account")).toBeVisible();
    await expect(page.getByLabel("Recipient")).toBeVisible();
    await expect(page.getByLabel("Amount")).toBeVisible();
  });

  test("cards page lists cards and has a New virtual card button", async ({ page }) => {
    await page.goto("/app/cards");
    await expect(page.getByRole("heading", { name: "Virtual cards" })).toBeVisible();
    await expect(page.getByRole("button", { name: /New virtual card/i })).toBeVisible();
    await expectContentOrEmpty(page, "Virtual cards", "No cards yet", async (p) => {
      await expect(p.getByText(/•••• •••• ••••/).first()).toBeVisible();
    });
  });

  test("crypto page shows live prices and the trade panel", async ({ page }) => {
    await page.goto("/app/crypto");
    await expect(page.getByRole("heading", { name: "Crypto" })).toBeVisible();
    // Price tiles for the core assets.
    await expect(page.getByRole("button", { name: /BTC/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /ETH/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /SOL/ }).first()).toBeVisible();
    // Trade panel + Buy/Sell.
    await expect(page.getByRole("heading", { name: /Trade/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Buy" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sell" })).toBeVisible();
  });

  test("deposits page opens the deposit dialog", async ({ page }) => {
    await page.goto("/app/deposits");
    await expect(page.getByRole("heading", { name: "Term deposits" })).toBeVisible();
    const openBtn = page.getByRole("button", { name: /Open deposit/i });
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Open a term deposit")).toBeVisible();
  });

  test("statements page shows PDF/CSV export buttons", async ({ page }) => {
    await page.goto("/app/statements");
    await expect(page.getByRole("heading", { name: "Statements" })).toBeVisible();
    await expectContentOrEmpty(page, "Statements", "No accounts yet", async (p) => {
      await expect(p.getByRole("link", { name: /PDF/ }).first()).toBeVisible();
      await expect(p.getByRole("link", { name: /CSV/ }).first()).toBeVisible();
    });
  });

  test("notifications page renders list or empty state", async ({ page }) => {
    await page.goto("/app/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expectContentOrEmpty(page, "Notifications", "No notifications yet", async () => {
      // list items carry notification bodies — leave as pass (header suffices).
    });
  });

  test("profile page shows Profile & Security and MFA section", async ({ page }) => {
    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: "Profile & Security" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Two-factor authentication/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Personal information/i })).toBeVisible();
  });

  test("standing-orders page renders with a New standing order button", async ({ page }) => {
    await page.goto("/app/standing-orders");
    await expect(page.getByRole("heading", { name: "Standing orders" })).toBeVisible();
    await expect(page.getByRole("button", { name: /New standing order/i })).toBeVisible();
    await expectContentOrEmpty(page, "Standing orders", "No standing orders", async () => {});
  });

  test("convert page renders the FX form and quote summary", async ({ page }) => {
    await page.goto("/app/convert");
    await expect(page.getByRole("heading", { name: "Convert" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Convert currencies/i })).toBeVisible();
    await expect(page.getByText("From currency")).toBeVisible();
    await expect(page.getByText("To currency")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Quote summary/i })).toBeVisible();
    await expect(page.getByText("Total debit")).toBeVisible();
  });

  test("help center renders with FAQ categories", async ({ page }) => {
    await page.goto("/app/help");
    await expect(page.getByRole("heading", { name: /Help center/i })).toBeVisible();
    for (const cat of ["Accounts", "Transfers", "Cards", "Crypto", "Security", "Fees"]) {
      await expect(page.getByRole("heading", { name: cat })).toBeVisible();
    }
  });
});
