import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, expectToastOrReload, LIVE } from "./support/demo";

test.describe("deposits", () => {
  test("deposits list renders", async ({ page }) => {
    await gotoApp(page, "/app/deposits");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Term deposits" })).toBeVisible();
      if (!LIVE) {
        await expect(page.getByText("$5,000.00")).toBeVisible();
        await expect(page.getByText("$2,500.00")).toBeVisible();
        await expect(page.getByText("4.25% p.a. · 90 days")).toBeVisible();
      }
    });
  });

  test("open-deposit dialog validates amount", async ({ page }) => {
    await gotoApp(page, "/app/deposits");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: "Open deposit" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Open a term deposit")).toBeVisible();
      await expect(dialog.getByText("Principal (USD)")).toBeVisible();

      const openBtn = dialog.getByRole("button", { name: "Open deposit" });
      const principal = dialog.getByLabel("Principal (USD)");
      await expect(openBtn).toBeDisabled();
      await principal.fill("1000");
      await expect(openBtn).toBeEnabled();
      await principal.fill("");
      await expect(openBtn).toBeDisabled();
    });
  });

  test("submit opens a deposit in demo mode", async ({ page }) => {
    test.skip(LIVE, "demo-mode success path");
    await gotoApp(page, "/app/deposits");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: "Open deposit" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Principal (USD)").fill("1000");
      await dialog.getByRole("button", { name: "Open deposit" }).click();
      await expectToastOrReload(page, /Term deposit of \$1,000\.00 opened/);
      await expect(page.getByRole("heading", { name: "Term deposits" })).toBeVisible();
    });
  });
});
