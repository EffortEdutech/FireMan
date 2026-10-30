import { defineConfig, devices } from "@playwright/test";
import { createRequire } from "node:module";

const { loadEnvConfig } = createRequire(import.meta.url)("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3060",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3060",
    reuseExistingServer: false,
    timeout: 120000
  }
});
