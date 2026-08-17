import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, expectToastOrReload, LIVE } from "./support/demo";

test.describe("admin payments / transfers", () => {
  test("approvals queue lists pending transfers", async ({ page }) => {
    await gotoApp(page, "/admin/payments");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Payment approvals" })).toBeVisible();
      if (!LIVE) {
        await expect(page.getByText(/Maker.?checker queue/)).toBeVisible();
        await expect(page.getByRole("button", { name: "Authorise" }).first()).toBeVisible();
        await expect(page.getByRole("button", { name: "Reject" }).first()).toBeVisible();
      }
    });
  });

  test("approve action shows success (demo) and posts (live)", async ({ page }) => {
    await gotoApp(page, "/admin/payments");
    await expectDemoOrSignIn(page, async () => {
      const authorise = page.getByRole("button", { name: "Authorise" }).first();
      if ((await authorise.count()) === 0) {
        await expect(page.getByText(/No pending approvals/)).toBeVisible();
        return;
      }
      const orderNo = await page.locator("tbody tr").first().locator("td").first().innerText();
      await authorise.click();
      await expectToastOrReload(page, "Payment approved and posted");
      if (LIVE) {
        // live settlement: the approved order must no longer be pending
        await expect(page.getByText(orderNo)).toHaveCount(0, { timeout: 15_000 });
      } else {
        await expect(page.getByRole("heading", { name: "Payment approvals" })).toBeVisible();
      }
    });
  });

  test("reject action shows confirmation", async ({ page }) => {
    await gotoApp(page, "/admin/payments");
    await expectDemoOrSignIn(page, async () => {
      const reject = page.getByRole("button", { name: "Reject" }).first();
      if ((await reject.count()) === 0) {
        await expect(page.getByText(/No pending approvals/)).toBeVisible();
        return;
      }
      await reject.click();
      await expectToastOrReload(page, "Payment rejected");
      await expect(page.getByRole("heading", { name: "Payment approvals" })).toBeVisible();
    });
  });
});
