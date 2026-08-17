import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, LIVE } from "./support/demo";

test.describe("transfers", () => {
  test("transfer form validates an empty destination", async ({ page }) => {
    await gotoApp(page, "/app/transfers");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Transfers" })).toBeVisible();
      await expect(page.getByText("New transfer")).toBeVisible();
      await page.getByLabel("Amount").fill("100");
      const submit = page.getByRole("button", { name: /Transfer/ });
      await expect(submit).toBeEnabled();
      await submit.click();
      // the recipient is required → the browser blocks submission
      const invalid = await page.locator("#to").evaluate((el: HTMLInputElement) => el.matches(":invalid"));
      expect(invalid).toBe(true);
    });
  });

  test("transfer form validates an amount <= 0", async ({ page }) => {
    await gotoApp(page, "/app/transfers");
    await expectDemoOrSignIn(page, async () => {
      const amount = page.getByLabel("Amount");
      await amount.fill("0");
      await expect(page.getByRole("button", { name: /Transfer/ })).toBeDisabled();
      await amount.fill("-5");
      await expect(page.getByRole("button", { name: /Transfer/ })).toBeDisabled();
    });
  });

  test("creates a transfer in demo mode", async ({ page }) => {
    test.skip(LIVE, "demo-mode success path");
    await gotoApp(page, "/app/transfers");
    await expectDemoOrSignIn(page, async () => {
      await page.getByLabel("Recipient").fill("DE89370400440532013000");
      await page.getByLabel("Amount").fill("100");
      await page.getByRole("button", { name: /Transfer/ }).click();
      await expect(page.getByRole("heading", { name: "Transfer initiated" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Make another transfer" })).toBeVisible();
    });
  });
});
