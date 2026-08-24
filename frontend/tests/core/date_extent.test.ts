import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { dayjsExtent } from "$lib/formatters/date";

describe("Dayjs extent", () => {
  it("returns undefined bounds for an empty input", () => {
    expect(dayjsExtent([])).toEqual([undefined, undefined]);
  });

  it("returns the original object for a singleton", () => {
    const date = dayjs("2023-05-10");
    const [start, end] = dayjsExtent([date]);
    expect(start).toBe(date);
    expect(end).toBe(date);
  });

  it("finds an unordered range and retains the original extrema", () => {
    const middle = dayjs("2023-05-10");
    const endDate = dayjs("2024-01-01");
    const startDate = dayjs("2022-12-31");
    const [start, end] = dayjsExtent([middle, endDate, startDate]);
    expect(start).toBe(startDate);
    expect(end).toBe(endDate);
  });

  it("keeps the first objects when extrema are duplicated", () => {
    const firstMin = dayjs("2022-01-01");
    const duplicateMin = dayjs("2022-01-01");
    const firstMax = dayjs("2024-01-01");
    const duplicateMax = dayjs("2024-01-01");
    const [start, end] = dayjsExtent([
      firstMin,
      duplicateMin,
      firstMax,
      duplicateMax,
    ]);
    expect(start).toBe(firstMin);
    expect(end).toBe(firstMax);
  });

  it("returns a normal chronological range", () => {
    const [start, end] = dayjsExtent([
      dayjs("2023-01-01"),
      dayjs("2023-06-01"),
      dayjs("2023-12-31"),
    ]);
    expect(start?.format("YYYY-MM-DD")).toBe("2023-01-01");
    expect(end?.format("YYYY-MM-DD")).toBe("2023-12-31");
  });
});
