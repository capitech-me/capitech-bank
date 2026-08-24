import { test, expect } from "@playwright/test";

/**
 * Public (unauthenticated) surfaces — the sign-up wizard and the sign-in page.
 * No real sign-up submission happens here (that would create accounts).
 */
test.describe("auth & signup (public)", () => {
  test("sign-up page loads the 3-step KYC wizard", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Open your account" })).toBeVisible();

    // Account-type selector: Personal + Business cards.
    await expect(page.getByRole("button", { name: "Personal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Business" })).toBeVisible();

    // Step-1 fields.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    // Continue drives the wizard (enabled; validation runs on click).
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeEnabled();

    // The step indicator reflects a multi-step flow.
    await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  });

  test("sign-up validates invalid email on Continue", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Open your account" })).toBeVisible();

    // Type a malformed email but leave password empty → client-side validation.
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("sign-in page loads the login form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByText("Protected by MFA")).toBeVisible();
  });
});
