import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import { buildInsightActionHref } from "./navigation";

describe("buildInsightActionHref", () => {
  test("preserves period and category account", () => {
    expect(
      buildInsightActionHref({
        id: "x",
        type: "category_spike",
        category: "spending",
        severity: "warning",
        score: 1,
        period: "2026-04",
        account: "Expenses:Health",
        href: "/expense/monthly",
      }),
    )
      .toBe("/expense/monthly?period=2026-04&account=Expenses%3AHealth");
  });
  test("preserves recurring key", () => {
    expect(
      buildInsightActionHref({
        id: "x",
        type: "recurring_increase",
        category: "recurring",
        severity: "info",
        score: 1,
        period: "2026-04",
        account: "OpenAI ChatGPT",
        href: "/cash_flow/recurring",
      }),
    )
      .toBe("/cash_flow/recurring?period=2026-04&key=OpenAI+ChatGPT");
  });
  test("ignores an invalid period", () => {
    expect(
      buildInsightActionHref({
        id: "x",
        type: "networth_change",
        category: "networth",
        severity: "info",
        score: 1,
        period: "bad",
        href: "/assets/networth",
      }),
    ).toBe("/assets/networth");
  });
});
