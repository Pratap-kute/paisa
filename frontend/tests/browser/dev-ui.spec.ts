import { expect, test } from "@playwright/test";

const variants = [
  { name: "desktop-light", width: 1440, height: 900, theme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, theme: "dark" },
  { name: "mobile-light", width: 390, height: 844, theme: "light" },
  { name: "mobile-dark", width: 390, height: 844, theme: "dark" },
] as const;

for (const variant of variants) {
  test(`/dev/ui smoke ${variant.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: variant.width,
      height: variant.height,
    });
    await page.emulateMedia({ colorScheme: variant.theme });
    await page.addInitScript((theme) => {
      localStorage.setItem("theme-preference", theme);
    }, variant.theme);

    await page.goto("/dev/ui");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Paisa UI Lab" }))
      .toBeVisible();
    await expect(page.getByText("₹1,85,42,000.00").first()).toBeVisible();

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);

    await page.getByRole("button", { name: "Open dialog" }).click();
    await expect(page.getByRole("dialog", { name: "Reconcile transaction" }))
      .toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Reconcile transaction" }))
      .toBeHidden();

    await page.getByRole("button", { name: "Open drawer" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  });
}
