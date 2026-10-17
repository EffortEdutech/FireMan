import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as {
  name: string;
  start_url: string;
  display: string;
  icons: Array<{ src: string; purpose?: string }>;
};
const serviceWorker = readFileSync("public/sw.js", "utf8");

describe("technician PWA assets", () => {
  it("declares an installable field app", () => {
    expect(manifest.name).toBe("FireMaint");
    expect(manifest.start_url).toBe("/technician/today");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons.some((icon) => icon.purpose?.includes("maskable"))).toBe(true);
  });

  it("keeps an offline shell and versioned cache", () => {
    expect(serviceWorker).toContain('const CACHE_NAME = "firemaint-shell-v1"');
    expect(serviceWorker).toContain('"/offline.html"');
    expect(serviceWorker).toContain("self.clients.claim()");
  });
});
