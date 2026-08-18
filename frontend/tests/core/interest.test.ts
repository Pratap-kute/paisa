import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  padTimeDomain,
  renderTable,
} from "$lib/charts/liabilities/interest";
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

describe("renderTable", () => {
  it("tolerates an empty overview timeline", () => {
    document.body.innerHTML = "<table><tbody></tbody></table>";
    const tbody = document.querySelector("tbody");
    const interest: Interest = {
      account: "Liabilities:Loan:Empty",
      overview_timeline: [],
      apr: 0,
    };

    expect(() => renderTable.call(tbody, interest)).not.toThrow();
    expect(tbody?.textContent).toContain("Empty");
    expect(tbody?.textContent).toContain("Loan Drawn");
  });
});
