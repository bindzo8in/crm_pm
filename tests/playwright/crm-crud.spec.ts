import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const mutationOptIn = process.env.CRM_E2E_RUN_MUTATIONS === "true";
const storageStatePath = process.env.CRM_E2E_STORAGE_STATE;
const expectedDatabase = process.env.CRM_E2E_DATABASE_NAME?.trim() ?? "";
const confirmedDatabase = process.env.CRM_E2E_CONFIRM_DATABASE?.trim() ?? "";
const appDatabase = process.env.CRM_E2E_APP_DATABASE_NAME?.trim() ?? "";
const allowNonDisposableDatabase =
  process.env.CRM_E2E_ALLOW_NON_DISPOSABLE_DATABASE === "true";
const databaseUrl = process.env.DATABASE_URL;

function databaseNameFromUrl(value: string | undefined): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    return "";
  }
}

const actualDatabase = databaseNameFromUrl(databaseUrl);
const mutationSetupIsSafe =
  Boolean(storageStatePath && existsSync(resolve(storageStatePath))) &&
  Boolean(expectedDatabase) &&
  expectedDatabase === confirmedDatabase &&
  expectedDatabase === appDatabase &&
  expectedDatabase === actualDatabase &&
  (allowNonDisposableDatabase || /e2e|test|disposable/i.test(expectedDatabase));

if (mutationOptIn && !mutationSetupIsSafe) {
  throw new Error(
    "CRM CRUD E2E mutations require an existing CRM_E2E_STORAGE_STATE and matching " +
      "CRM_E2E_DATABASE_NAME, CRM_E2E_CONFIRM_DATABASE, CRM_E2E_APP_DATABASE_NAME, " +
      "and DATABASE_URL database names. Non-disposable databases additionally require " +
      "CRM_E2E_ALLOW_NON_DISPOSABLE_DATABASE=true.",
  );
}

test.describe("CRM create and edit workflows", () => {
  test.skip(
    !mutationOptIn,
    "Mutation tests are opt-in. Configure and confirm an isolated CRM E2E database first.",
  );

  test("creates and edits customers; validates business and individual names", async ({ page }) => {
    test.setTimeout(90_000);
    const contactName = uniqueName("CRM E2E Contact");
    const updatedDisplayName = uniqueName("CRM E2E Edited Contact");

    await gotoReady(page, "/dashboard/customers/create");
    await page.getByRole("button", { name: "Create customer", exact: true }).last().click();
    await expect(page.getByText("Company name is required.", { exact: true })).toBeVisible();

    await page.getByLabel("Individual").check();
    await page.getByRole("button", { name: "Create customer", exact: true }).last().click();
    await expect(page.getByText("Primary contact name is required.", { exact: true })).toBeVisible();

    await page.getByLabel("First name").fill(contactName);
    await waitForCreateNameAvailability(page);
    await expect(page.getByRole("combobox", { name: "Display Name" })).toHaveValue(contactName);
    await page.getByRole("button", { name: "Create customer", exact: true }).last().click();
    await expect(page).toHaveURL(/\/dashboard\/customers\/?$/);

    await gotoReady(page, "/dashboard/customers/create");
    await page.getByLabel("Company name").fill(contactName);
    await expect(page.getByText(/already exists/)).toBeVisible();
    await gotoReady(page, "/dashboard/customers");

    const customerRow = page.getByRole("row").filter({ hasText: contactName });
    await expect(customerRow).toBeVisible();
    await customerRow.getByRole("button").click();
    const editAction = page.getByRole("menuitem", { name: "Edit" });
    await expect(editAction).toHaveAttribute("href", /\/dashboard\/customers\/[^/]+\/edit$/);
    await editAction.click();
    await page.waitForURL(/\/dashboard\/customers\/[^/]+\/edit$/, { timeout: 15_000 });

    const displayNameInput = page.getByRole("combobox", { name: "Display Name" });
    await displayNameInput.fill(updatedDisplayName);
    const saveButton = page.getByRole("button", { name: /Save changes|Update customer/ }).last();
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toBeEnabled();
    await displayNameInput.press("Escape");
    await saveButton.click();
    await expect(page).toHaveURL(/\/dashboard\/customers\/?$/);
    await expect(page.getByRole("row").filter({ hasText: updatedDisplayName })).toBeVisible();
  });

  test("creates and edits an invoice; validates customer, item, and quantity", async ({ page }) => {
    test.setTimeout(120_000);
    const customerName = await createBusinessCustomer(page);
    const itemName = uniqueName("CRM E2E Service");
    const editedItemName = uniqueName("CRM E2E Updated Service");

    await gotoReady(page, "/dashboard/invoices/create");
    await page.getByRole("button", { name: "Save Draft Invoice", exact: true }).last().click();
    await expect(page.getByText(/Customer is required/)).toBeVisible();
    await expect(page.getByText(/At least one line item|Item name is required/i)).toBeVisible();

    await chooseCustomer(page, customerName);
    await page.locator('[name="lineItems.0.name"]').fill(itemName);
    await page.locator('[name="lineItems.0.quantity"]').fill("0");
    await page.getByRole("button", { name: "Save Draft Invoice", exact: true }).last().click();
    await expect(page.getByText("Quantity must be at least 1")).toBeVisible();

    await page.locator('[name="lineItems.0.quantity"]').fill("2");
    await page.locator('[name="lineItems.0.unitPrice"]').fill("-1");
    await page.getByRole("button", { name: "Save Draft Invoice", exact: true }).last().click();
    await expect(page.getByText("Unit price must be >= 0")).toBeVisible();

    await page.locator('[name="lineItems.0.unitPrice"]').fill("1000");
    await page.getByRole("button", { name: "Save Draft Invoice", exact: true }).last().click();
    await expect(page).toHaveURL(/\/dashboard\/invoices\/(?!create$|new$)[^/]+$/);

    const invoiceId = new URL(page.url()).pathname.split("/").at(-1);
    expect(invoiceId).toBeTruthy();
    await gotoReady(page, `/dashboard/invoices/${invoiceId}/edit`);
    await page.locator("#line-item-0-name").fill(editedItemName);
    await page.getByRole("button", { name: "Save Draft Invoice", exact: true }).last().click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/invoices/${invoiceId}$`));
    await expect(page.getByText(editedItemName, { exact: true })).toBeVisible();
  });

  test("creates and edits a proposal; requires a customer", async ({ page }) => {
    test.setTimeout(120_000);
    const customerName = await createBusinessCustomer(page);
    const proposalTitle = uniqueName("CRM E2E Proposal");
    const editedTitle = uniqueName("CRM E2E Revised Proposal");

    await gotoReady(page, "/dashboard/proposals/create");
    await page.getByRole("button", { name: "Save draft and continue" }).click();
    await expect(page.locator("#customerId")).toHaveAttribute("aria-invalid", "true");

    await chooseCustomer(page, customerName);
    await page.locator("#title").fill(proposalTitle);
    await page.getByRole("button", { name: "Save draft and continue" }).click();
    await expect(page).toHaveURL(/\/dashboard\/proposals\/[^/]+\/builder$/);

    const proposalId = new URL(page.url()).pathname.split("/").at(-2);
    expect(proposalId).toBeTruthy();
    await gotoReady(page, `/dashboard/proposals/${proposalId}/edit`);
    await page.locator("#title").fill(editedTitle);
    await page.getByRole("button", { name: "Save details and continue" }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/proposals/${proposalId}/builder$`));
  });

  test("creates and edits a project; validates required name and date order", async ({ page }) => {
    test.setTimeout(90_000);
    const projectName = uniqueName("CRM E2E Project");
    const editedName = uniqueName("CRM E2E Updated Project");

    await gotoReady(page, "/dashboard/projects/new");
    await page.getByRole("button", { name: "Create project", exact: true }).last().click();
    expect(
      await page.getByLabel(/Project name/).evaluate((input) => input.matches(":invalid")),
    ).toBe(true);

    await page.getByLabel(/Project name/).fill(projectName);
    await page.getByLabel("Start date").fill("2099-12-30");
    await page.getByLabel("Target completion").fill("2099-12-29");
    await page.getByRole("button", { name: "Create project", exact: true }).last().click();
    await expect(page.getByText("Project details are invalid.")).toBeVisible();

    await page.getByLabel("Target completion").fill("2099-12-31");
    await page.getByRole("button", { name: "Create project", exact: true }).last().click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/(?!new$|create$)[^/]+$/);

    const projectId = new URL(page.url()).pathname.split("/").at(-1);
    expect(projectId).toBeTruthy();
    await gotoReady(page, `/dashboard/projects/${projectId}/edit`);
    await page.getByLabel(/Project name/).fill(editedName);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${projectId}$`));
    await expect(page.getByText(editedName, { exact: true })).toBeVisible();
  });

  test("creates and edits a project task; validates due-date ordering", async ({ page }) => {
    test.setTimeout(120_000);
    const projectName = uniqueName("CRM E2E Task Project");
    const taskName = uniqueName("CRM E2E Task");
    const editedTaskName = uniqueName("CRM E2E Updated Task");

    const projectId = await createProject(page, projectName);
    await gotoReady(page, `/dashboard/projects/${projectId}`);
    await page.getByRole("button", { name: "Tasks", exact: true }).click();
    await page.getByRole("button", { name: "Create task", exact: true }).click();

    const dialog = page.getByRole("dialog");
    const taskTitle = dialog.getByRole("textbox", { name: "Task name" });
    await expect(dialog.getByRole("button", { name: "Create task", exact: true })).toBeDisabled();
    await taskTitle.fill(taskName);
    await dialog.getByLabel("Start date").fill("2099-12-30");
    await dialog.getByLabel("Due date").fill("2099-12-29");
    await dialog.getByRole("button", { name: "Create task", exact: true }).click();
    await expect(page.getByText("Task details are invalid.")).toBeVisible();

    await dialog.getByLabel("Due date").fill("2099-12-31");
    await dialog.getByRole("button", { name: "More task fields" }).click();
    await dialog.getByLabel("Time estimate (hours)").fill("-1");
    expect(await dialog.getByLabel("Time estimate (hours)").evaluate((input) => input.matches(":invalid"))).toBe(true);
    await dialog.getByLabel("Time estimate (hours)").fill("0");
    await dialog.getByLabel("Sprint points").fill("101");
    expect(await dialog.getByLabel("Sprint points").evaluate((input) => input.matches(":invalid"))).toBe(true);
    await dialog.getByLabel("Sprint points").fill("100");
    await dialog.getByRole("button", { name: "Create task", exact: true }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole("button", { name: taskName, exact: true }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByLabel("Task title").fill(editedTaskName);
    await drawer.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(drawer.getByRole("heading", { name: editedTaskName })).toBeVisible();
  });

  test("creates and edits an expense; validates amount and required selections", async ({ page }) => {
    test.setTimeout(120_000);
    const customerName = await createBusinessCustomer(page);
    const categoryName = uniqueName("CRM E2E Expense Category");
    const referenceNumber = uniqueName("CRM-E2E-REF");
    const editedAmount = "246.80";

    await gotoReady(page, "/dashboard/finance/expenses/create");
    await page.locator("#expense-amount").fill("0");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect(await page.locator("#expense-amount").evaluate((input) => input.matches(":invalid"))).toBe(true);

    await page.getByRole("button", { name: "Select a category" }).click();
    await page.getByRole("button", { name: "Create category", exact: true }).click();
    await page.locator("#expense-category-name").fill(categoryName);
    await page.getByRole("button", { name: "Create and select" }).click();

    const account = page.locator("#expense-account");
    await expect(account).toBeEnabled();
    expect(await account.locator("option").count()).toBeGreaterThan(1);
    await account.selectOption({ index: 1 });
    await page.locator("#expense-amount").fill("123.45");
    await page.locator("#expense-invoice-number").fill(referenceNumber);
    await chooseCustomer(page, customerName);

    await page.getByRole("button", { name: "Select GST treatment" }).click();
    await page.getByRole("option", { name: /Unregistered Business/ }).click();
    await page.getByRole("button", { name: "Select source state" }).click();
    await page.getByLabel("Search source states").fill("Tamil Nadu");
    await page.getByRole("option", { name: /Tamil Nadu/ }).click();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/finance\/?$/);
    await page.getByLabel("Search transactions").fill(referenceNumber);
    await page.getByRole("button", { name: "Run report" }).click();

    const expenseRow = page.getByRole("row").filter({ hasText: referenceNumber });
    await expect(expenseRow).toBeVisible();
    await expenseRow.getByRole("link", { name: "Edit", exact: true }).click();
    await page.locator("#expense-amount").fill(editedAmount);
    await page.getByRole("button", { name: "Update expense", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/finance\/?$/);
    await page.getByLabel("Search transactions").fill(referenceNumber);
    await page.getByRole("button", { name: "Run report" }).click();
    const updatedExpenseRow = page.getByRole("row").filter({ hasText: referenceNumber });
    await expect(updatedExpenseRow.getByText(/246\.80/)).toBeVisible();
    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await updatedExpenseRow.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: referenceNumber })).toHaveCount(0);
  });
});

async function createBusinessCustomer(page: Page): Promise<string> {
  const companyName = uniqueName("CRM E2E Company");
  await gotoReady(page, "/dashboard/customers/create");
  await page.getByLabel("Company name").fill(companyName);
  await waitForCreateNameAvailability(page);
  await page.getByRole("button", { name: "Create customer", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard\/customers\/?$/);
  await expect(page.getByRole("row").filter({ hasText: companyName })).toBeVisible();
  return companyName;
}

async function createProject(page: Page, name: string): Promise<string> {
  await gotoReady(page, "/dashboard/projects/new");
  await page.getByLabel(/Project name/).fill(name);
  await page.getByRole("button", { name: "Create project", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/(?!new$|create$)[^/]+$/);
  const projectId = new URL(page.url()).pathname.split("/").at(-1);
  if (!projectId || projectId === "new" || projectId === "create") {
    throw new Error("Project creation redirected without a project ID.");
  }
  return projectId;
}

async function chooseCustomer(page: Page, customerName: string): Promise<void> {
  await page.getByRole("combobox").filter({ hasText: "Select customer" }).click();
  const search = page.getByPlaceholder("Search customer...");
  await search.fill(customerName);
  const createCustomerOption = page.getByRole("option", { name: "Create customer", exact: true });
  await expect(createCustomerOption).toBeVisible();
  await expect(createCustomerOption).toHaveCount(1);
  await expect(page.getByRole("option").last()).toHaveText("Create customer");
  const customerOption = page.getByRole("option").filter({ hasText: customerName }).first();
  await expect(customerOption).toBeVisible();
  await customerOption.click();
}

async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

async function waitForCreateNameAvailability(page: Page): Promise<void> {
  const submitButton = page.getByRole("button", { name: "Create customer", exact: true }).last();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toBeEnabled();
  await expect(
    page.getByText("Used as the customer name on invoices and proposals.", { exact: true }),
  ).toBeVisible();
}

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
