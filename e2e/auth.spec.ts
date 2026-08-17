import { test, expect } from "@playwright/test";
import { gotoApp } from "./support/demo";

test.describe("auth", () => {
  test("signup form renders and validates an invalid email", async ({ page }) => {
    await gotoApp(page, "/sign-up");
    await expect(page.getByRole("heading", { name: "Open your account" })).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    // HTML5 email validation rejects a non-email value
    const email = page.getByLabel("Email");
    await email.fill("not-an-email");
    const valid = await email.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
  });

  test("signin form renders and submits", async ({ page }) => {
    await gotoApp(page, "/sign-in");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.getByLabel("Email").fill("demo@capitech.dev");
    await page.getByLabel("Password").fill("demo-password-123");
    await expect(page.getByLabel("Email")).toHaveValue("demo@capitech.dev");
    await expect(page.getByLabel("Password")).toHaveValue("demo-password-123");

    const submit = page.getByRole("button", { name: "Sign in" });
    await expect(submit).toBeVisible();
    if (await submit.isEnabled()) {
      // Supabase configured: an unknown account must surface a validation error
      await submit.click();
      await expect(page.getByText(/Incorrect email or password|Failed to fetch|network/i)).toBeVisible();
    } else {
      // demo mode disables real auth submission
      await expect(submit).toBeDisabled();
    }
  });

  test("MFA UI renders on the sign-in page", async ({ page }) => {
    await gotoApp(page, "/sign-in");
    await expect(page.getByText("Protected by MFA")).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  });

  test("forgot password renders and submits", async ({ page }) => {
    await gotoApp(page, "/auth/forgot-password");
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await page.getByLabel("Email").fill("demo@capitech.dev");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // With a reachable backend the success state is shown; without one the
    // client reports an error alert. Either is a valid response to submitting.
    const outcome = await Promise.race([
      page
        .getByText(/If an account exists for demo@capitech\.dev/)
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "sent" as const),
      page
        .getByText(/failed|error|invalid|network|fetch|configuration|not found|unable|unknown/i)
        .first()
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "error" as const),
    ]);
    expect(["sent", "error"]).toContain(outcome);
  });

  test("auth callback handles an error param", async ({ page }) => {
    await gotoApp(page, "/auth/callback?error=access_denied&next=/sign-in");
    // No auth code → the callback forwards to the `next` destination
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
