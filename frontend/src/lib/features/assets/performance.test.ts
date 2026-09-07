import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import {
  performanceLink,
  performancePercent,
  performanceQuery,
  performanceReason,
  performanceSeries,
} from "./performance";

describe("investment performance presentation", () => {
  test("preserves selected period across account navigation", () => {
    const params = new URLSearchParams(
      "from=2026-04-01&to=2026-09-06&unrelated=1",
    );
    expect(performanceQuery(params)).toEqual({
      from: "2026-04-01",
      to: "2026-09-06",
    });
    expect(performanceLink("Assets:Brokerage:A", params)).toBe(
      "/assets/gain/Assets%3ABrokerage%3AA?from=2026-04-01&to=2026-09-06",
    );
    expect(performanceQuery(new URLSearchParams())).toEqual({
      preset: "current_fy",
    });
  });
  test("does not turn missing percentages into zero", () => {
    expect(performancePercent(null)).toBe("—");
    expect(performancePercent(undefined)).toBe("—");
    expect(performanceReason("insufficient_weighted_capital")).toContain(
      "capital base",
    );
  });
  test("timeline uses backend contribution baseline and masks series and tooltips", () => {
    const result = {
      timeline: [{
        date: "2026-09-06",
        value: 1400000,
        contributionBaseline: 1350000,
      }],
    };
    expect(performanceSeries(result).points[0].values).toEqual({
      value: 1400000,
      baseline: 1350000,
    });
    const hidden = performanceSeries(result, true).points[0];
    expect(hidden.values).toEqual({ value: 0, baseline: 0 });
    expect(hidden.tooltipRows?.every((row) => row[1] === 0)).toBe(true);
  });
});
