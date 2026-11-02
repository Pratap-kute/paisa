import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import DashboardInvestmentPerformance from "./DashboardInvestmentPerformance.svelte";
import { formatCurrency } from "$lib/shared/formatters/currency";

// A browser collapses the whitespace between markup lines; textContent does not.
const rendered = (node: Element | null | undefined) =>
  (node?.textContent ?? "").replace(/\s+/g, " ").trim();

for (const amount of [50000, -40000, 0]) {
  test(`shows investment return ${amount} independently of portfolio growth`, () => {
    const { container } = render(DashboardInvestmentPerformance, {
      summary: {
        investmentReturn: amount,
        portfolioChange: 400000,
        periodReturn: 0.064,
        quality: { status: "complete" },
      },
    });
    expect(rendered(container)).toContain(
      `${formatCurrency(amount)} investment return`,
    );
    expect(rendered(container)).not.toContain(
      `${formatCurrency(400000)} investment return`,
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/assets/gain?preset=current_fy",
    );
  });
}
test("shows unavailable performance without a fabricated zero", () => {
  const { container } = render(DashboardInvestmentPerformance, {
    summary: undefined,
  });
  expect(rendered(container)).toContain("Performance unavailable");
  expect(rendered(container)).not.toContain("0%");
});

test("privacy changes mask already-rendered monetary values", async () => {
  const { obscure } = await import("$lib/shared/state/persisted");
  const { tick } = await import("svelte");
  obscure.set(false);
  const { container } = render(DashboardInvestmentPerformance, {
    summary: { investmentReturn: 7654321, quality: { status: "complete" } },
  });
  const visible = formatCurrency(7654321);
  expect(rendered(container)).toContain(visible);
  obscure.set(true);
  await tick();
  expect(rendered(container)).not.toContain(visible);
  obscure.set(false);
});

test("shows reconciliation failure error message", () => {
  const { container } = render(DashboardInvestmentPerformance, {
    error: "investment_performance_reconciliation_failed",
  });
  expect(rendered(container)).toContain(
    "Investment performance could not be calculated because the data did not reconcile.",
  );
  expect(rendered(container)).not.toContain("Performance unavailable");
});

test("shows generic calculation failure error message", () => {
  const { container } = render(DashboardInvestmentPerformance, {
    error: "investment_performance_failed",
  });
  expect(rendered(container)).toContain(
    "Investment performance could not be calculated.",
  );
  expect(rendered(container)).not.toContain("Performance unavailable");
});
