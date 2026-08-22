import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  buildInterestOverviewComparison,
  buildInterestTimelineSeries,
  interestSummary,
  timelineDomain,
} from "$lib/charts/interest_data";
import type { Interest } from "$lib/core/utils";

const interest: Interest = {
  account: "Liabilities:Loan:Home",
  apr: 8.5,
  overview_timeline: [
    {
      date: dayjs("2024-01-01"),
      drawn_amount: 1000,
      repaid_amount: 100,
      interest_amount: 50,
    },
    {
      date: dayjs("2024-02-01"),
      drawn_amount: 1000,
      repaid_amount: 250,
      interest_amount: 80,
    },
  ],
};

describe("interest chart adapters", () => {
  it("preserves latest account comparison values and units", () => {
    expect(interestSummary(interest)).toMatchObject({
      drawn: 1000,
      repaid: 250,
      interest: 80,
      balance: 830,
      apr: 8.5,
    });
    const point = buildInterestOverviewComparison([interest]).points[0];
    expect(point.value).toBe(830);
    expect(point.target).toBe(1000);
    expect(point.secondaryValue).toBe(8.5);
  });

  it("preserves per-period drawn, repaid, interest, and balance", () => {
    const data = buildInterestTimelineSeries(interest);
    expect(data.points[0].values).toMatchObject({
      drawn: 1000,
      repaid: 100,
      interestLoss: 50,
      balance: 950,
    });
    expect(data.points[1].values.balance).toBe(830);
  });

  it("keeps each account's own timeline domain", () => {
    const domain = timelineDomain(interest.overview_timeline);
    expect(domain?.[0].format("YYYY-MM-DD")).toBe("2024-01-01");
    expect(domain?.[1].format("YYYY-MM-DD")).toBe("2024-02-01");
  });
});
