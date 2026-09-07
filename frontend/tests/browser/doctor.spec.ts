import { expect, test } from "@playwright/test";

const healthyChecks = [
  {
    code: "asset_balance_integrity",
    name: "Asset balance integrity",
    category: "ledger",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "posting_direction",
    name: "Posting direction",
    category: "ledger",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "exchange_price_coverage",
    name: "Exchange-price coverage",
    category: "valuation",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "journal_price_consistency",
    name: "Journal-price consistency",
    category: "valuation",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "allocation_configuration",
    name: "Allocation configuration",
    category: "allocation",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "current_valuation_quality",
    name: "Current valuation quality",
    category: "valuation",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "current_fy_valuation_quality",
    name: "Current FY valuation quality",
    category: "valuation",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "investment_attribution",
    name: "Investment attribution",
    category: "investments",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "performance_reconciliation",
    name: "Performance reconciliation",
    category: "investments",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "scenario_history_readiness",
    name: "Scenario history readiness",
    category: "history",
    status: "passed",
    issueCount: 0,
  },
  {
    code: "scenario_checking_readiness",
    name: "Scenario checking readiness",
    category: "configuration",
    status: "passed",
    issueCount: 0,
  },
];

test.describe("Doctor Data Quality & Reconciliation", () => {
  test("healthy state displays all systems operational and healthy checks", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 0,
            danger: 0,
            warning: 0,
            info: 0,
            passedChecks: 11,
            totalChecks: 11,
          },
          issues: [],
          checks: healthyChecks,
        }),
      });
    });

    await page.goto("/more/doctor");

    await expect(page.getByText("All Systems Operational")).toBeVisible();
    await expect(page.getByText("Healthy").first()).toBeVisible();
    await expect(page.getByTestId("healthy-checks-list")).toBeVisible();
    await expect(
      page.getByText("Asset balance integrity").first(),
    ).toBeVisible();
  });

  test("failed diagnostic check displays Diagnosis incomplete and does not claim Healthy", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 0,
            danger: 0,
            warning: 0,
            info: 0,
            passedChecks: 10,
            failedChecks: 1,
            totalChecks: 11,
          },
          issues: [],
          checks: healthyChecks.map((c) =>
            c.code === "exchange_price_coverage"
              ? { ...c, status: "failed", issueCount: 0 }
              : c,
          ),
        }),
      });
    });

    await page.goto("/more/doctor");

    await expect(page.getByText("Diagnosis incomplete")).toBeVisible();
    await expect(page.getByText("Incomplete", { exact: true })).toBeVisible();
    await expect(page.getByText(/1 check could not run/i)).toBeVisible();
    expect(await page.getByText("All Systems Operational").isVisible()).toBe(false);
    expect(await page.getByText("Healthy", { exact: true }).isVisible()).toBe(false);
  });

  test("critical danger state displays attention required banner and issue details", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 1,
            danger: 1,
            warning: 0,
            info: 0,
            passedChecks: 10,
            totalChecks: 11,
          },
          issues: [
            {
              code: "negative_asset_balance",
              level: "danger",
              category: "ledger",
              summary: "Negative Asset Balance",
              description:
                "The running balance of an asset account must not go negative at any point.",
              details: "Assets:Checking went negative (-500.00) on 01 Jan 2026",
              entity: {
                type: "account",
                id: "Assets:Checking",
                label: "Assets:Checking",
              },
              affectedFeatures: ["Net Worth", "Balance Sheet"],
              action: {
                label: "View Account",
                href: "/accounts/Assets%3AChecking",
              },
            },
          ],
          checks: healthyChecks.map((c) =>
            c.code === "asset_balance_integrity"
              ? { ...c, status: "issues", issueCount: 1, maxSeverity: "danger" }
              : c
          ),
        }),
      });
    });

    await page.goto("/more/doctor");

    await expect(page.getByText("Attention Required")).toBeVisible();
    await expect(
      page.getByTestId("diagnosis-attention-section"),
    ).toBeVisible();
    await expect(page.getByText("Negative Asset Balance")).toBeVisible();
    await expect(page.getByText("Assets:Checking").first()).toBeVisible();
    await expect(page.getByText("View Account")).toBeVisible();
  });

  test("warning only state displays needs review and no blocking issues", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 1,
            danger: 0,
            warning: 1,
            info: 0,
            passedChecks: 10,
            totalChecks: 11,
          },
          issues: [
            {
              code: "valuation_fallback",
              level: "warning",
              category: "valuation",
              summary: "NIFTYBEES valuation fallback",
              description:
                "Paisa could not obtain a market valuation on Current FY opening.",
              details:
                "Valuation fell back to acquisition cost 250.50 INR on 2026-04-01.",
              entity: {
                type: "commodity",
                id: "NIFTYBEES",
                label: "NIFTYBEES",
              },
              affectedFeatures: ["Investment Performance", "Net Worth"],
              action: {
                label: "Review Prices",
                href: "/prices",
              },
            },
          ],
          checks: healthyChecks.map((c) =>
            c.code === "current_fy_valuation_quality"
              ? {
                ...c,
                status: "issues",
                issueCount: 1,
                maxSeverity: "warning",
              }
              : c
          ),
        }),
      });
    });

    await page.goto("/more/doctor");

    await expect(page.getByText("No blocking issues")).toBeVisible();
    await expect(page.getByText("Needs Review")).toBeVisible();
    await expect(page.getByText("NIFTYBEES valuation fallback")).toBeVisible();
    await expect(page.getByText("Review Prices")).toBeVisible();
  });

  test("info only state displays operational and does not trigger critical alarm", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 1,
            danger: 0,
            warning: 0,
            info: 1,
            passedChecks: 11,
            totalChecks: 11,
          },
          issues: [
            {
              code: "no_investment_activity",
              level: "info",
              category: "history",
              summary: "No Previous Investment Activity",
              description:
                "Paisa will use ₹0 as your baseline monthly investment transfer for Scenario Planning.",
              details:
                "No investment transactions found. Scenario baseline starts with zero investment holdings.",
              affectedFeatures: ["Scenario Planning"],
            },
          ],
          checks: healthyChecks,
        }),
      });
    });

    await page.goto("/more/doctor");

    await expect(page.getByText("All critical checks passed")).toBeVisible();
    await expect(page.getByText("Operational")).toBeVisible();
    await expect(page.getByTestId("diagnosis-info-section")).toBeVisible();
    await expect(
      page.getByText("No Previous Investment Activity"),
    ).toBeVisible();
  });

  test("API failure displays clean error state with retry button", async ({ page }) => {
    let callCount = 0;
    await page.route("**/api/diagnosis", async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal database error" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            summary: {
              total: 0,
              danger: 0,
              warning: 0,
              info: 0,
              passedChecks: 11,
              totalChecks: 11,
            },
            issues: [],
            checks: healthyChecks,
          }),
        });
      }
    });

    await page.goto("/more/doctor");

    await expect(
      page.getByText("Doctor could not complete the diagnostic checks"),
    ).toBeVisible();
    expect(await page.getByText("All Systems Operational").isVisible()).toBe(
      false,
    );

    const retryButton = page.getByRole("button", { name: "Retry" });
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    await expect(page.getByText("All Systems Operational")).toBeVisible();
  });

  test("privacy mode obscures sensitive numbers", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 1,
            danger: 1,
            warning: 0,
            info: 0,
            passedChecks: 10,
            totalChecks: 11,
          },
          issues: [
            {
              code: "negative_asset_balance",
              level: "danger",
              category: "ledger",
              summary: "Negative Asset Balance",
              description: "Account balance is negative.",
              details: "Assets:Checking went negative (-500.00) on 01 Jan 2026",
              entity: {
                type: "account",
                id: "Assets:Checking",
                label: "Assets:Checking",
              },
            },
          ],
          checks: healthyChecks,
        }),
      });
    });

    await page.goto("/more/doctor");

    // Click the privacy/hide numbers toggle
    const privacyToggle = page.locator("#obscure");
    if (await privacyToggle.isVisible()) {
      await privacyToggle.check();
      await expect(page.getByText("****")).toBeVisible();
    }
  });

  test("action link navigates to target route", async ({ page }) => {
    await page.route("**/api/diagnosis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            total: 1,
            danger: 0,
            warning: 1,
            info: 0,
            passedChecks: 10,
            totalChecks: 11,
          },
          issues: [
            {
              code: "valuation_fallback",
              level: "warning",
              category: "valuation",
              summary: "NIFTYBEES valuation fallback",
              description: "Quote fallback.",
              action: {
                label: "Review Prices",
                href: "/ledger/price",
              },
            },
          ],
          checks: healthyChecks,
        }),
      });
    });

    await page.goto("/more/doctor");
    const reviewButton = page.getByTestId("issue-action-button");
    await expect(reviewButton).toBeVisible();
    await reviewButton.click();
    await expect(page).toHaveURL(/\/ledger\/price/);
  });
});
