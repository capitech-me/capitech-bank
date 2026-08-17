import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, expectToastOrReload, LIVE } from "./support/demo";

test.describe("cards", () => {
  test("cards list renders", async ({ page }) => {
    await gotoApp(page, "/app/cards");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Virtual cards" })).toBeVisible();
      if (!LIVE) {
        await expect(page.getByText("•••• •••• •••• 4242")).toBeVisible();
        await expect(page.getByText("•••• •••• •••• 5518")).toBeVisible();
      }
    });
  });

  test("create-card dialog opens", async ({ page }) => {
    await gotoApp(page, "/app/cards");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: "New virtual card" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Create a virtual card")).toBeVisible();
      await expect(dialog.getByText("Name on card")).toBeVisible();
      await expect(dialog.getByText("Daily limit")).toBeVisible();
      await dialog.getByRole("combobox").first().click();
      await expect(page.getByRole("option", { name: "Visa" })).toBeVisible();
      await expect(page.getByRole("option", { name: "Mastercard" })).toBeVisible();
    });
  });

  test("freeze toggles a card", async ({ page }) => {
    await gotoApp(page, "/app/cards");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Virtual cards" })).toBeVisible();
      const freeze = page.getByRole("button", { name: "Freeze" }).first();
      if ((await freeze.count()) === 0) {
        return; // no active card to freeze on this backend
      }
      await freeze.click();
      await expectToastOrReload(page, "Card frozen");
      await expect(page.getByRole("heading", { name: "Virtual cards" })).toBeVisible();
    });
  });

  test("card limits display", async ({ page }) => {
    await gotoApp(page, "/app/cards");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByText("Daily limit")).toBeVisible();
      await expect(page.getByText("Expiry")).toBeVisible();
      if (!LIVE) {
        await expect(page.getByText("$2,000.00")).toBeVisible();
        await expect(page.getByText("$500.00")).toBeVisible();
      }
    });
  });
});
