import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import dayjs from "dayjs";
import { isHistoricalPeriod, isInPeriod, validPeriod } from "./period.ts";

describe("period-aware drilldowns", () => {
  test("accepts only complete calendar month parameters", () => {
    expect(validPeriod("2026-04")).toBe("2026-04");
    expect(validPeriod("2026-13")).toBeUndefined();
    expect(validPeriod("April 2026")).toBeUndefined();
    expect(validPeriod(null)).toBeUndefined();
  });

  test("filters investment activity to the requested month", () => {
    const dates = [
      dayjs("2026-03-31"),
      dayjs("2026-04-01"),
      dayjs("2026-04-30"),
      dayjs("2026-05-01"),
    ];
    expect(dates.filter((date) => isInPeriod(date, "2026-04")))
      .toEqual([dates[1], dates[2]]);
  });

  test("treats only a valid non-current period as historical", () => {
    expect(isHistoricalPeriod("2026-04", "2026-08")).toBe(true);
    expect(isHistoricalPeriod("2026-08", "2026-08")).toBe(false);
    expect(isHistoricalPeriod(undefined, "2026-08")).toBe(false);
  });
});
