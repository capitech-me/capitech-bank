import { test, expect } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, LIVE } from "./support/demo";

test.describe("statements", () => {
  test("statements page renders export buttons", async ({ page }) => {
    await gotoApp(page, "/app/statements");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Statements" })).toBeVisible();
      await expect(page.getByText(/PDF or CSV/)).toBeVisible();
      if (!LIVE) {
        await expect(page.getByRole("link", { name: "PDF" })).toBeVisible();
        await expect(page.getByRole("link", { name: "CSV" })).toBeVisible();
      }
    });
  });

  test("download triggers a statement file", async ({ page }) => {
    test.skip(!LIVE, "requires live backend and a session");
    await gotoApp(page, "/app/statements");
    const pdfLink = page.getByRole("link", { name: "PDF" }).first();
    await expect(pdfLink).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await pdfLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/statement-.*\.pdf/);
  });
});
