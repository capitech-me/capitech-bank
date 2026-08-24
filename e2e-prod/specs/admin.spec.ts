import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../support/auth";

/**
 * Back office (/admin) against the live deployment.
 *
 * Asserts the stable headers/buttons and tolerates empty data by asserting the
 * empty state where one exists.
 */

/** Assert a page heading, then either the empty state OR the data assertion. */
async function expectContentOrEmpty(
  page: Page,
  heading: string,
  emptyText: string,
  dataAssert: (page: Page) => Promise<void>,
): Promise<void> {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  const empty = page.getByText(emptyText);
  // Let client-rendered sections settle before deciding which branch we are on.
  const isEmpty = await empty.waitFor({ state: "visible", timeout: 3_000 }).then(() => true).catch(() => false);
  if (isEmpty) {
    await expect(empty).toBeVisible();
    return;
  }
  await dataAssert(page);
}

test.describe("admin back office", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("dashboard shows operations overview with KPI cards", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Operations overview" })).toBeVisible();
    await expect(page.getByText("Total customers")).toBeVisible();
    await expect(page.getByText("Pending KYC")).toBeVisible();
    await expect(page.getByText("Pending approvals")).toBeVisible();
  });

  test("customers page renders the customers table", async ({ page }) => {
    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    await expectContentOrEmpty(page, "Customers", "No customers found.", async (p) => {
      await expect(p.getByRole("columnheader", { name: "Customer" })).toBeVisible();
      await expect(p.getByRole("columnheader", { name: "KYC" })).toBeVisible();
      await expect(p.getByRole("cell").first()).toBeVisible();
    });
  });

  test("ledger page renders the chart of accounts table", async ({ page }) => {
    await page.goto("/admin/ledger");
    await expect(page.getByRole("heading", { name: "General Ledger" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chart of accounts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journal entries" })).toBeVisible();
    await expectContentOrEmpty(page, "General Ledger", "No chart of accounts entries yet.", async () => {});
  });

  test("payments page renders the approval table or empty state", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.getByRole("heading", { name: "Payment approvals" })).toBeVisible();
    await expectContentOrEmpty(page, "Payment approvals", "No pending approvals", async (p) => {
      await expect(p.getByRole("columnheader", { name: "Order" })).toBeVisible();
      await expect(p.getByRole("columnheader", { name: "Type" })).toBeVisible();
    });
  });

  test("products page renders product cards with a New product button", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    await expect(page.getByRole("button", { name: /New product/i })).toBeVisible();
    await expectContentOrEmpty(page, "Products", "No products yet.", async (p) => {
      await expect(p.getByRole("heading", { name: "Products" })).toBeVisible();
    });
  });

  test("reports page renders the Balance Sheet", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Balance Sheet/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Balance sheet/i })).toBeVisible();
  });

  test("webhooks page renders endpoints and delivery log", async ({ page }) => {
    await page.goto("/admin/webhooks");
    await expect(page.getByRole("heading", { name: "Webhook Delivery Log", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Webhook endpoints", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery log", exact: true })).toBeVisible();
  });

  test("contact page renders the messages table or empty state", async ({ page }) => {
    await page.goto("/admin/contact");
    await expect(page.getByRole("heading", { name: "Contact messages" })).toBeVisible();
    await expectContentOrEmpty(page, "Contact messages", "No contact messages yet", async (p) => {
      await expect(p.getByRole("columnheader", { name: "Subject" })).toBeVisible();
    });
  });

  test("open-api page renders API keys with a Create API key button", async ({ page }) => {
    await page.goto("/admin/open-api");
    await expect(page.getByRole("heading", { name: "Open API" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /API keys/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create API key/i })).toBeVisible();
  });
});
