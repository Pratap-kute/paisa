import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { interestSummary, padTimeDomain } from "$lib/charts/interest_data";
import type { Interest } from "$lib/core/utils";

describe("padTimeDomain", () => {
  it("pads a single-point domain so start and end are not identical", () => {
    const day = dayjs("2024-01-15");
    const [start, end] = padTimeDomain(day, day);
    expect(start.isSame(end)).toBe(false);
    expect(end.diff(start, "day")).toBe(2);
  });

  it("leaves a multi-day domain unchanged", () => {
    const start = dayjs("2024-01-01");
    const end = dayjs("2024-02-01");
    expect(padTimeDomain(start, end)).toEqual([start, end]);
  });
});

describe("interestSummary", () => {
  it("tolerates an empty overview timeline", () => {
    const interest: Interest = {
      account: "Liabilities:Loan:Empty",
      overview_timeline: [],
      apr: 0,
    };

    expect(interestSummary(interest)).toMatchObject({
      label: "Loan:Empty",
      drawn: 0,
      repaid: 0,
      interest: 0,
      balance: 0,
      apr: 0,
    });
  });
});
