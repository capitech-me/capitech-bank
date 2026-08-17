import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, LIVE } from "./support/demo";

test.describe("crypto", () => {
  test("price table renders", async ({ page }) => {
    await gotoApp(page, "/app/crypto");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Crypto" })).toBeVisible();
      for (const asset of ["BTC", "ETH", "SOL", "USDT"]) {
        await expect(page.getByText(asset, { exact: true })).toBeVisible();
      }
      await expect(page.getByText("Trade")).toBeVisible();
      await expect(page.getByText("Your wallets")).toBeVisible();
      await expect(page.getByText("Recent orders")).toBeVisible();
    });
  });

  test("buy form validates amount", async ({ page }) => {
    await gotoApp(page, "/app/crypto");
    await expectDemoOrSignIn(page, async () => {
      const amount = page.getByLabel(/Amount/);
      await expect(amount).toBeVisible();
      await amount.fill("0");
      const buy = page.getByRole("button", { name: "Buy BTC" });
      if (await buy.isEnabled()) {
        await buy.click();
        await expect(page.getByText("Select an account and enter an amount")).toBeVisible();
      } else {
        // prices not loaded (demo/offline) → trading is locked
        await expect(buy).toBeDisabled();
      }
    });
  });

  test("sell form validates", async ({ page }) => {
    await gotoApp(page, "/app/crypto");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("tab", { name: "Sell" }).click();
      const sell = page.getByRole("button", { name: "Sell BTC" });
      await expect(sell).toBeVisible();
      await page.getByLabel(/Amount/).fill("0");
      if (await sell.isEnabled()) {
        await sell.click();
        await expect(page.getByText("Select an account and enter an amount")).toBeVisible();
      } else {
        await expect(sell).toBeDisabled();
      }
    });
  });

  test("order history renders", async ({ page }) => {
    await gotoApp(page, "/app/crypto");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByText("Recent orders")).toBeVisible();
      if (!LIVE) {
        // demo mode has no session → no orders yet
        await expect(page.getByText("No orders yet.")).toBeVisible();
      }
    });
  });
});
