import { expect, type Page } from "@playwright/test";

/** AppShell shows the drawer trigger below the `lg` (1024px) breakpoint. */
export async function assertNavigationVisible(page: Page) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 1024) {
    await expect(page.getByRole("button", { name: "Open navigation menu" }))
      .toBeVisible();
    return;
  }
  await expect(page.locator('aside nav[aria-label="main navigation"]'))
    .toBeVisible();
}
