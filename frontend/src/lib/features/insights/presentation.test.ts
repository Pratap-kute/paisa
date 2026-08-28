import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import type { Insight } from "$lib/domain/insights";

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
globalThis.USER_CONFIG = {
  accounts: [],
  default_currency: "INR",
  display_precision: 2,
  locale: "en-IN",
  financial_year_starting_month: 4,
  week_starting_day: 1,
} as typeof USER_CONFIG;
const { presentInsight } = await import("./presentation.ts");

const base: Insight = {
  id: "x",
  type: "",
  category: "spending",
  severity: "warning",
  score: 50,
};

describe("insight presentation refinements", () => {
  test("uses absolute impact and a ratio for an extreme expense percentage", () => {
    const p = presentInsight({
      ...base,
      type: "expense_change",
      value: 719302,
      previousValue: 63766,
      change: 655536,
      changePercent: 1028,
    });
    expect(p.title).toContain("increased by");
    expect(p.description).toContain("× the comparison level");
    expect(p.heroMetric).not.toContain("1028");
  });

  test("describes a rolling category baseline as typical recent spend", () => {
    const p = presentInsight({
      ...base,
      type: "category_spike",
      account: "Expenses:Utilities",
      value: 6156,
      previousValue: 3250,
      change: 2906,
      changePercent: 89,
      baselineMethod: "rolling_median",
    });
    expect(p.description).toContain("Typical recent spend");
    expect(p.description).not.toContain("in March");
  });

  test("uses the comparison month for a previous-period baseline", () => {
    const p = presentInsight({
      ...base,
      type: "category_spike",
      account: "Expenses:Utilities",
      value: 6156,
      previousValue: 3250,
      change: 2906,
      changePercent: 89,
      baselineMethod: "previous_period",
      comparisonPeriod: "2026-03",
    });
    expect(p.description).toContain("in March");
  });

  test("keeps net-worth composition informational with negative capital wording", () => {
    const p = presentInsight({
      ...base,
      type: "networth_contribution",
      category: "investment",
      severity: "info",
      change: 100,
      investmentContribution: -500,
      gainContribution: 600,
    });
    expect(p.tone).toBe("info");
    expect(p.description).toContain("net capital withdrawn");
  });
});
