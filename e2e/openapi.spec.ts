import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, LIVE } from "./support/demo";

test.describe("open api", () => {
  test("admin API keys page renders", async ({ page }) => {
    await gotoApp(page, "/admin/open-api");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Open API" })).toBeVisible();
      await expect(page.getByRole("tab", { name: /API keys/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Webhooks/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create API key" })).toBeVisible();
      if (!LIVE) {
        // the list endpoint needs a live session → demo shows the empty state
        await expect(page.getByText("No API keys yet.")).toBeVisible();
      }
    });
  });

  test("create key UI works", async ({ page }) => {
    await gotoApp(page, "/admin/open-api");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: "Create API key" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Create an API key")).toBeVisible();
      await expect(dialog.getByText("Owner ID (customer or organization uuid)")).toBeVisible();
      await expect(dialog.getByText("Key name")).toBeVisible();
      await expect(dialog.getByText("Scopes")).toBeVisible();

      const create = dialog.getByRole("button", { name: "Create" });
      await expect(create).toBeDisabled();
      await dialog.locator('input[placeholder="uuid"]').fill("00000000-0000-0000-0000-000000000000");
      await dialog.locator('input[placeholder="Acme Production"]').fill("E2E Test Key");
      await expect(create).toBeEnabled();

      if (LIVE) {
        // real creation returns the raw key exactly once
        await create.click();
        await expect(page.getByText("Key created")).toBeVisible({ timeout: 15_000 });
      } else {
        // demo: the API needs a live session → creation is rejected
        await create.click();
        await expect(page.getByText("Key created")).toHaveCount(0);
        await expect(dialog.getByText("Create an API key")).toBeVisible();
      }
    });
  });
});
