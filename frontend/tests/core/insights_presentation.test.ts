import { describe, expect, test } from "vitest";
import { presentInsight } from "$lib/features/insights/presentation";
import type { Insight as _Insight } from "$lib/domain/insights";

describe("presentInsight", () => {
  test("presents expense increase insight", () => {
    const insight: _Insight = {
      id: "expense_change:2026-08",
      type: "expense_change",
      category: "spending",
      severity: "warning",
      score: 64,
      value: 82400,
      previousValue: 72280,
      change: 10120,
      changePercent: 14,
      period: "2026-08",
      comparisonPeriod: "2026-07",
      href: "/expense/monthly",
    };

    const p = presentInsight(insight, false, "2026-07");
    expect(p.title).toContain("Expenses increased 14%");
    expect(p.description).toContain("July");
    expect(p.tone).toBe("info"); // 14% is info, >=20% is warning
    expect(p.icon).toBe("fa-solid fa-arrow-trend-up");
    expect(p.badgeText).toBe("+14.0%");
  });

  test("presents partial month-to-date comparison", () => {
    const insight: _Insight = {
      id: "expense_change:2026-08",
      type: "expense_change",
      category: "spending",
      severity: "warning",
      score: 75,
      value: 82400,
      previousValue: 72280,
      change: 10120,
      changePercent: 25,
      period: "2026-08",
      comparisonPeriod: "2026-07",
    };

    const p = presentInsight(insight, true, "2026-07");
    expect(p.description).toContain("July (month-to-date)");
    expect(p.tone).toBe("warning");
  });

  test("presents category spike insight", () => {
    const insight: _Insight = {
      id: "category_spike:2026-08:Expenses:Food:Dining",
      type: "category_spike",
      category: "spending",
      severity: "warning",
      score: 65,
      value: 18160,
      previousValue: 14300,
      change: 3860,
      changePercent: 27,
      account: "Expenses:Food:Dining",
      period: "2026-08",
      comparisonPeriod: "2026-07",
    };

    const p = presentInsight(insight);
    expect(p.title).toContain("Dining spending increased 27%");
    expect(p.tone).toBe("info");
  });

  test("presents savings rate decline insight with percentage points", () => {
    const insight: _Insight = {
      id: "savings_rate_change:2026-08",
      type: "savings_rate_change",
      category: "savings",
      severity: "warning",
      score: 70,
      value: 31,
      previousValue: 38,
      change: -7,
      period: "2026-08",
      comparisonPeriod: "2026-07",
    };

    const p = presentInsight(insight);
    expect(p.title).toContain("Savings rate fell to 31%");
    expect(p.description).toContain("Down from 38%");
    expect(p.badgeText).toContain("7.0 pp");
    expect(p.tone).toBe("info");
  });

  test("presents net worth change and contribution", () => {
    const nw: _Insight = {
      id: "networth_change:2026-08",
      type: "networth_change",
      category: "networth",
      severity: "positive",
      score: 45,
      value: 1240000,
      previousValue: 1116000,
      change: 124000,
      changePercent: 11.1,
      period: "2026-08",
    };

    const pNw = presentInsight(nw);
    expect(pNw.title).toContain("Net worth increased");
    expect(pNw.tone).toBe("positive");

    const contrib: _Insight = {
      id: "networth_contribution:2026-08",
      type: "networth_contribution",
      category: "investment",
      severity: "positive",
      score: 40,
      value: 1240000,
      change: 124000,
      investmentContribution: 65000,
      gainContribution: 59000,
      period: "2026-08",
    };

    const pContrib = presentInsight(contrib);
    expect(pContrib.title).toBe("Net worth change composition");
    expect(pContrib.description).toContain("investments");
    expect(pContrib.description).toContain("gain / valuation effect");
  });

  test("presents abnormal savings rate normalization with factual copy", () => {
    const insight: _Insight = {
      id: "savings_rate_change:2026-08",
      type: "savings_rate_change",
      category: "savings",
      severity: "info",
      score: 45,
      value: 35,
      previousValue: 140,
      change: -105,
      period: "2026-08",
      comparisonPeriod: "2026-07",
    };

    const p = presentInsight(insight);
    expect(p.title).toContain("Savings rate fell to 35%");
    expect(p.description).toContain("unusually high savings rate");
    expect(p.tone).toBe("info");
  });

  test("presents budget overspent and budget risk", () => {
    const overspent: _Insight = {
      id: "budget_overspent:2026-08:Expenses:Food",
      type: "budget_overspent",
      category: "budget",
      severity: "critical",
      score: 85,
      value: 12500,
      previousValue: 10000,
      change: 2500,
      account: "Expenses:Food",
    };

    const pOver = presentInsight(overspent);
    expect(pOver.title).toContain("Food budget exceeded by");
    expect(pOver.tone).toBe("critical");

    const risk: _Insight = {
      id: "budget_risk:2026-08:Expenses:Utilities",
      type: "budget_risk",
      category: "budget",
      severity: "warning",
      score: 48,
      value: 8900,
      previousValue: 10000,
      change: 1100,
      changePercent: 89,
      account: "Expenses:Utilities",
    };

    const pRisk = presentInsight(risk);
    expect(pRisk.title).toContain("Utilities budget is 89% used");
    expect(pRisk.tone).toBe("warning");
  });

  test("presents cash warning", () => {
    const cash: _Insight = {
      id: "cash_warning:negative_checking",
      type: "cash_warning",
      category: "cash",
      severity: "critical",
      score: 100,
      value: -4500,
    };

    const p = presentInsight(cash);
    expect(p.title).toBe("Checking balance is negative");
    expect(p.tone).toBe("critical");
  });
});
