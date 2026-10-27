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

async function signIn(page: Page, account: Credentials, expectedPath: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 10000 });
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10000 });
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Continue" }).click({ timeout: 10000 });

  try {
    // Sign-in succeeds server-side quickly, but the first render of a role dashboard can be slow.
    await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 30000 });
  } catch {
    const currentPath = new URL(page.url()).pathname;
    const alerts = await page.getByRole("alert").allTextContents().catch(() => []);
    const passwordField = page.getByLabel("Password");
    if (await passwordField.isVisible().catch(() => false)) {
      await passwordField.fill("", { timeout: 1000 }).catch(() => undefined);
    }
    throw new Error(
      `Sign-in did not reach ${expectedPath}; current path: ${currentPath}; app feedback: ${alerts.join(" ").trim() || "none"}. Credentials were omitted.`
    );
  }
}

function requiredAccount(account: TestAccount): Credentials {
  return {
    email: account.email!,
    password: account.password!
  };
}

test.describe("authenticated smoke", () => {
  test.describe.configure({ mode: "serial" });
  test("owner can reach management dashboard and operations routes", async ({ page }) => {
    test.skip(!hasCredentials(accounts.owner), "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run owner smoke tests.");

    await signIn(page, requiredAccount(accounts.owner), "/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/maintenance");
    await expect(page.getByRole("heading", { name: "Maintenance" })).toBeVisible();

    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  });

  test("technician lands on today queue", async ({ page }) => {
    test.skip(!hasCredentials(accounts.technician), "Set E2E_TECHNICIAN_EMAIL and E2E_TECHNICIAN_PASSWORD to run technician smoke tests.");
    test.setTimeout(30000);

    await signIn(page, requiredAccount(accounts.technician), "/technician/today");

    await expect(page).toHaveURL(/\/technician\/today$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.getByText("Signed in")).toBeVisible();
  });

  test("technician field routes and logout remain reachable", async ({ page }) => {
    test.skip(!hasCredentials(accounts.technician), "Set E2E_TECHNICIAN_EMAIL and E2E_TECHNICIAN_PASSWORD to run technician route smoke tests.");
    test.setTimeout(30000);

    await signIn(page, requiredAccount(accounts.technician), "/technician/today");
    await expect(page).toHaveURL(/\/technician\/today$/);

    for (const route of ["/technician/jobs", "/technician/scan", "/technician/more"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 10000 });
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
    }
    await page.getByRole("banner").getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("client A can see issued report portal", async ({ page }) => {
    test.skip(!hasCredentials(accounts.clientA), "Set E2E_CLIENT_A_EMAIL and E2E_CLIENT_A_PASSWORD to run Client A smoke tests.");

    await signIn(page, requiredAccount(accounts.clientA), "/client/dashboard");

    await expect(page).toHaveURL(/\/client\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Client Dashboard" })).toBeVisible();
    await expect(page.getByText("Review issued maintenance reports and attached evidence.")).toBeVisible();

    const reportLink = page.locator('a[href^="/client/reports/"]').first();
    if (await reportLink.count()) {
      await reportLink.click();
      await expect(page.getByRole("heading", { name: /UKB-/ })).toBeVisible();
      await expect(page.getByText("Report template used")).toBeVisible();
      await expect(page.getByText("Frozen on report")).toBeVisible();
    }

    await page.goto("/technician/today");
    await expect(page).toHaveURL(/\/client\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Client Dashboard" })).toBeVisible();
  });

  test("client B remains isolated from Client A issued reports", async ({ page }) => {
    test.skip(!hasCredentials(accounts.clientB), "Set E2E_CLIENT_B_EMAIL and E2E_CLIENT_B_PASSWORD to run Client B smoke tests.");

    await signIn(page, requiredAccount(accounts.clientB), "/client/dashboard");

    await expect(page).toHaveURL(/\/client\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Client Dashboard" })).toBeVisible();
    await expect(page.getByText("No issued reports loaded")).toBeVisible();
    await expect(page.locator('a[href^="/client/reports/"]')).toHaveCount(0);
  });

});
