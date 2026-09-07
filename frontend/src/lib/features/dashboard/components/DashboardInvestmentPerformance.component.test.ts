import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import DashboardInvestmentPerformance from "./DashboardInvestmentPerformance.svelte";
import { formatCurrency } from "$lib/shared/formatters/currency";

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
    expect(container.textContent).toContain(
      `${formatCurrency(amount)} investment return`,
    );
    expect(container.textContent).not.toContain(
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
  expect(container.textContent).toContain("Performance unavailable");
  expect(container.textContent).not.toContain("0%");
});

test("privacy changes mask already-rendered monetary values", async () => {
  const { obscure } = await import("$lib/shared/state/persisted");
  const { tick } = await import("svelte");
  obscure.set(false);
  const { container } = render(DashboardInvestmentPerformance, {
    summary: { investmentReturn: 7654321, quality: { status: "complete" } },
  });
  const visible = formatCurrency(7654321);
  expect(container.textContent).toContain(visible);
  obscure.set(true);
  await tick();
  expect(container.textContent).not.toContain(visible);
  obscure.set(false);
});
