import { test, expect, type Page } from "@playwright/test";
import { gotoApp, expectDemoOrSignIn, LIVE } from "./support/demo";

/** Fill the plain text input that sits in the same field group as `label`. */
async function fillField(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByText(label, { exact: true }).locator("..");
  await field.locator("input").fill(value);
}

/** Pick an option in a Radix Select whose trigger shares a field group with `label`. */
async function selectOption(page: Page, label: string, option: string): Promise<void> {
  const field = page.getByText(label, { exact: true }).locator("..");
  await field.getByRole("combobox").click();
  await page.getByRole("option", { name: option }).click();
}

test.describe("onboarding", () => {
  test("retail onboarding form fields", async ({ page }) => {
    await gotoApp(page, "/app/onboarding");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Complete your onboarding" })).toBeVisible();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Personal details")).toBeVisible();
      for (const label of [
        "Legal first name",
        "Legal last name",
        "Date of birth",
        "Nationality",
        "Country of residence",
        "Residential address",
        "City",
      ]) {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
      }
    });
  });

  test("corporate onboarding form fields", async ({ page }) => {
    await gotoApp(page, "/app/onboarding");
    await expectDemoOrSignIn(page, async () => {
      await expect(page.getByRole("heading", { name: "Complete your onboarding" })).toBeVisible();
      await page.getByRole("button", { name: /Business \/ Corporate/ }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Company details")).toBeVisible();
      for (const label of [
        "Legal company name",
        "Registration number",
        "Country of incorporation",
        "Entity type (optional)",
        "Industry (optional)",
      ]) {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
      }
    });
  });

  test("KYC status section renders during onboarding", async ({ page }) => {
    await gotoApp(page, "/app/onboarding");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: /Business \/ Corporate/ }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await fillField(page, "Legal company name", "Acme E2E Ltd");
      await fillField(page, "Registration number", "REG-123456");
      await selectOption(page, "Country of incorporation", "Germany");
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page.getByText("Identity verification")).toBeVisible();
      await expect(page.getByText("Secure identity check")).toBeVisible();
      await expect(page.getByRole("button", { name: "Verify my identity with Didit" })).toBeVisible();
    });
  });

  test("submit shows success in demo mode", async ({ page }) => {
    test.skip(LIVE, "demo-mode success path");
    await gotoApp(page, "/app/onboarding");
    await expectDemoOrSignIn(page, async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await fillField(page, "Legal first name", "Jane");
      await fillField(page, "Legal last name", "Doe");
      await fillField(page, "Date of birth", "1990-01-15");
      await selectOption(page, "Nationality", "Germany");
      await selectOption(page, "Country of residence", "United States");
      await fillField(page, "Residential address", "1 Test Street");
      await fillField(page, "City", "Testville");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Submit application" }).click();

      await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
    });
  });
});
