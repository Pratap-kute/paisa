import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import type { DashboardAttentionItem } from "../summary";
import DashboardInsightGateway from "./DashboardInsightGateway.svelte";

function item(index: number): DashboardAttentionItem {
  return {
    id: `item-${index}`,
    kind: "insight",
    title: index === 1
      ? "A deliberately long attention title that must remain readable on narrow dashboard layouts"
      : `Attention ${index}`,
    detail: `Supporting detail ${index}`,
    icon: "fa-solid fa-triangle-exclamation",
    status: "warning",
    href: `/expense/monthly?item=${index}`,
    priority: 100 - index,
  };
}

test("renders an honest empty attention state and period-aware insights link", () => {
  const { container } = render(DashboardInsightGateway, {
    items: [],
    period: "2026-08",
  });
  expect(container.textContent).toContain(
    "No material issues detected this month",
  );
  expect(container.querySelector("a")?.getAttribute("href"))
    .toBe("/insights?period=2026-08");
});

test("renders one keyboard-accessible attention link", () => {
  const { container } = render(DashboardInsightGateway, {
    items: [item(1)],
    period: "2026-08",
  });
  expect(container.textContent).toContain("1 item needs attention");
  const links = container.querySelectorAll(
    "[data-testid='dashboard-attention-item']",
  );
  expect(links).toHaveLength(1);
  expect(links[0].getAttribute("href")).toBe("/expense/monthly?item=1");
  expect(links[0]).toHaveClass("focus-visible:outline-2");
});

test("renders a maximum presentation set of three attention rows", () => {
  const { container } = render(DashboardInsightGateway, {
    items: [item(1), item(2), item(3)],
    period: "2026-08",
  });
  expect(container.textContent).toContain("3 items need attention");
  expect(
    container.querySelectorAll("[data-testid='dashboard-attention-item']"),
  ).toHaveLength(3);
  expect(container.querySelector(".break-words")).toBeInTheDocument();
});

test("does not present failure as financial health", () => {
  const { container } = render(DashboardInsightGateway, {
    items: [],
    period: "2026-08",
    failed: true,
  });
  expect(container.textContent).toContain("Insights unavailable");
  expect(container.textContent).not.toContain("No material issues");
});
