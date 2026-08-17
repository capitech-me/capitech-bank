import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, LIVE } from "./support/demo";

test.describe("accounts", () => {
  test("dashboard shows accounts", async ({ page }) => {
    await gotoApp(page, "/app");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Your money at a glance" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();
      if (!LIVE) {
        await expect(page.getByText(/3 accounts · balances updated live/)).toBeVisible();
      }
    });
  });

  test("account detail shows IBAN", async ({ page }) => {
    await gotoApp(page, "/app/accounts");
    await expectDemoOrSignIn(page, async () => {
      await page.locator("a[href*='/accounts/']").first().click();
      await expect(page.getByText("Account number")).toBeVisible();
      await expect(page.getByText("IBAN")).toBeVisible();
      await expect(page.getByText("BIC / SWIFT")).toBeVisible();
      if (!LIVE) {
        // demo IBANs are generated German accounts
        await expect(page.getByText(/^DE\d{2}/)).toBeVisible();
      }
    });
  });

  test("open-account dialog lists products", async ({ page }) => {
    await gotoApp(page, "/app/accounts");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: "Open account" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Open a new account")).toBeVisible();
      await dialog.getByRole("combobox").nth(0).click();
      await expect(page.getByRole("option", { name: "Multi-Currency Current" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Savings Plus" })).toBeVisible();
    });
  });

  test("per-currency balances render", async ({ page }) => {
    await gotoApp(page, "/app");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByText(/\bbalance\b/).first()).toBeVisible();
      if (!LIVE) {
        await expect(page.getByText("USD balance")).toBeVisible();
        await expect(page.getByText("EUR balance")).toBeVisible();
        await expect(page.getByText("GBP balance")).toBeVisible();
      }
    });
  });
});
