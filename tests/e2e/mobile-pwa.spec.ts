import { expect, test } from "@playwright/test";
import { devices } from "@playwright/test";

const pixel5 = devices["Pixel 5"];
const iphone13 = devices["iPhone 13"];

for (const [name, device] of [["Pixel 5", pixel5], ["iPhone 13", iphone13]] as const) {
  const { defaultBrowserType: _defaultBrowserType, ...mobileDevice } = device;
  test.describe(`${name} PWA smoke`, () => {
    test.use(mobileDevice);

    test("login shell fits the mobile viewport", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });

    test("serves install and offline shell assets", async ({ page, request }) => {
      const manifest = await request.get("/manifest.webmanifest");
      expect(manifest.ok()).toBe(true);
      expect((await manifest.json()).start_url).toBe("/technician/today");

      const offline = await request.get("/offline.html");
      expect(offline.ok()).toBe(true);
      await page.goto("/offline.html");
      await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
    });
  });
}
