import { expect, type Page, test } from "@playwright/test";

type TestAccount = {
  email: string | undefined;
  password: string | undefined;
};

type Credentials = {
  email: string;
  password: string;
};

const accounts = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL,
    password: process.env.E2E_OWNER_PASSWORD
  },
  technician: {
    email: process.env.E2E_TECHNICIAN_EMAIL,
    password: process.env.E2E_TECHNICIAN_PASSWORD
  },
  clientA: {
    email: process.env.E2E_CLIENT_A_EMAIL,
    password: process.env.E2E_CLIENT_A_PASSWORD
  },
  clientB: {
    email: process.env.E2E_CLIENT_B_EMAIL,
    password: process.env.E2E_CLIENT_B_PASSWORD
  }
} satisfies Record<string, TestAccount>;

function hasCredentials(account: TestAccount) {
  return Boolean(account.email && account.password);
}

async function signIn(page: Page, account: Credentials) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Continue" }).click();
}

function requiredAccount(account: TestAccount): Credentials {
  return {
    email: account.email!,
    password: account.password!
  };
}

test.describe("authenticated smoke", () => {
  test("owner can reach management dashboard and operations routes", async ({ page }) => {
    test.skip(!hasCredentials(accounts.owner), "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run owner smoke tests.");

    await signIn(page, requiredAccount(accounts.owner));

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/maintenance");
    await expect(page.getByRole("heading", { name: "Maintenance" })).toBeVisible();

    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  });

  test("technician lands on today queue", async ({ page }) => {
    test.skip(!hasCredentials(accounts.technician), "Set E2E_TECHNICIAN_EMAIL and E2E_TECHNICIAN_PASSWORD to run technician smoke tests.");

    await signIn(page, requiredAccount(accounts.technician));

    await expect(page).toHaveURL(/\/technician\/today$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.getByText("Signed in")).toBeVisible();
  });

  test("client A can see issued report portal", async ({ page }) => {
    test.skip(!hasCredentials(accounts.clientA), "Set E2E_CLIENT_A_EMAIL and E2E_CLIENT_A_PASSWORD to run Client A smoke tests.");

    await signIn(page, requiredAccount(accounts.clientA));

    await expect(page).toHaveURL(/\/client\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Client Dashboard" })).toBeVisible();
    await expect(page.getByText("Issued reports and evidence will appear here.")).toBeVisible();

    const reportLink = page.locator('a[href^="/client/reports/"]').first();
    if (await reportLink.count()) {
      await reportLink.click();
      await expect(page.getByRole("heading", { name: /UKB-/ })).toBeVisible();
      await expect(page.getByText("Report template used")).toBeVisible();
      await expect(page.getByText("Frozen on report")).toBeVisible();
    }
  });

  test("client B remains isolated from Client A issued reports", async ({ page }) => {
    test.skip(!hasCredentials(accounts.clientB), "Set E2E_CLIENT_B_EMAIL and E2E_CLIENT_B_PASSWORD to run Client B smoke tests.");

    await signIn(page, requiredAccount(accounts.clientB));

    await expect(page).toHaveURL(/\/client\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Client Dashboard" })).toBeVisible();
    await expect(page.getByText("No issued reports loaded")).toBeVisible();
    await expect(page.locator('a[href^="/client/reports/"]')).toHaveCount(0);
  });
});
