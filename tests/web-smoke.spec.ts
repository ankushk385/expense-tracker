import { test, expect } from "@playwright/test";

const baseURL = process.env.EXPO_WEB_URL ?? "http://127.0.0.1:8082";

test.use({
  viewport: { width: 390, height: 844 },
  launchOptions: {
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  },
});

test("web app loads without a runtime error", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2_000);
  await expect(page.locator("body")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("authentication or onboarding entry is usable", async ({ page }) => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2_000);
  const body = page.locator("body");
  await expect(body).toContainText(/track every rupee|welcome back|expense tracker|home/i);
});
