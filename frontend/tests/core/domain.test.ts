import { beforeAll, describe, expect, test, vi } from "vitest";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { change } from "../../src/lib/domain/posting";
import {
  findBreakPoints,
  forecast,
  project,
  solvePMTOrNper,
} from "../../src/lib/domain/goals";
import {
  intervalText,
  nextUnpaidSchedule,
  scheduleIcon,
  sortTrantionSequence,
  totalRecurring,
} from "../../src/lib/domain/transaction_sequence";
import { setNow } from "../../src/lib/core/utils";

beforeAll(() => {
  dayjs.extend(isSameOrBefore);
  dayjs.extend(utc);
  dayjs.extend(timezone);
  setNow(dayjs("2024-01-15"));
});

describe("goals", () => {
  test("solves monthly savings or target date", () => {
    expect(solvePMTOrNper(100_000, 8, 10_000, 0, "2023-01-01"))
      .toEqual({ pmt: 0, targetDate: "" });
    const byDate = solvePMTOrNper(100_000, 8, 10_000, 0, "2025-01-01");
    expect(byDate.pmt).toBeGreaterThan(0);
    expect(byDate.targetDate).toBe("2025-01-01");
    const byPayment = solvePMTOrNper(100_000, 8, 10_000, 5_000, "invalid");
    expect(byPayment.targetDate).toMatch(/^202\d-\d{2}-\d{2}$/);
  });

  test("projects values and rejects completed or past goals", () => {
    expect(project(10, 8, dayjs("2025-01-01"), 100, 10)).toEqual([]);
    expect(project(1000, 8, dayjs("2023-01-01"), 100, 10)).toEqual([]);
    const points = project(1000, 8, dayjs("2024-05-01"), 100, 10);
    expect(points).toHaveLength(4);
    expect(points[0].date.format("YYYY-MM-DD")).toBe("2024-02-01");
  });

  test("finds quarter breakpoints without mutating expectations", () => {
    const points = [10, 25, 50, 75, 100].map((value, i) => ({
      date: dayjs("2024-01-01").add(i, "day"),
      value,
    }));
    expect(findBreakPoints([...points], 100).map((p) => p.value))
      .toEqual([25, 50, 75, 100]);
    expect(findBreakPoints([], 100)).toEqual([]);
  });

  test("falls back between forecast configurations", () => {
    const predict = vi.fn()
      .mockReturnValueOnce([[], []])
      .mockReturnValueOnce([[120], [4]]);
    class FakeArima {
      constructor(_config: object) {}
      train(_values: number[]) {
        return this;
      }
      predict(days: number) {
        return predict(days);
      }
    }
    const result = forecast(
      [{ date: dayjs("2024-01-01"), value: 100 }],
      110,
      FakeArima as never,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ value: 120, error: 2 });
  });
});

describe("posting and recurring transactions", () => {
  const posting = (overrides: object = {}) => ({
    commodity: "USD",
    quantity: 1,
    market_amount: 120,
    amount: 100,
    date: dayjs("2023-01-15"),
    ...overrides,
  });

  test("annualizes gains and losses", () => {
    expect(change(posting() as never).class).toBe("paisa-text-success");
    expect(change(posting({ market_amount: 80 }) as never).class)
      .toBe("paisa-text-danger");
    expect(change(posting({ commodity: "INR" }) as never).value).toBe(0);
    expect(change(posting({ quantity: 0 }) as never).percentage).toBe(0);
  });

  test.each([
    [7, "weekly"],
    [15, "bi-weekly"],
    [30, "monthly"],
    [90, "quarterly"],
    [180, "half-yearly"],
    [365, "yearly"],
    [10, "every 10 days"],
  ])("describes a %d day interval", (interval, expected) => {
    expect(intervalText({ interval } as never)).toBe(expected);
  });

  test("selects unpaid schedules and totals transactions", () => {
    const unpaid = { scheduled: dayjs("2024-01-01"), actual: null };
    const paid = {
      scheduled: dayjs("2024-02-01"),
      actual: dayjs("2024-02-01"),
    };
    expect(
      nextUnpaidSchedule(
        { pastSchedules: [unpaid], futureSchedules: [] } as never,
      ),
    )
      .toBe(unpaid);
    expect(
      nextUnpaidSchedule(
        { pastSchedules: [paid], futureSchedules: [paid, unpaid] } as never,
      ),
    )
      .toBe(unpaid);
    expect(
      totalRecurring(
        {
          transactions: [{ postings: [{ amount: -2 }, { amount: 8 }] }],
        } as never,
      ),
    )
      .toBe(8);
    expect(scheduleIcon(unpaid as never).color).toBe("paisa-text-danger");
  });

  test("sorts sequences by proximity to now", () => {
    const near = {
      pastSchedules: [],
      futureSchedules: [{ scheduled: dayjs("2024-01-16"), actual: null }],
    };
    const far = {
      pastSchedules: [],
      futureSchedules: [{ scheduled: dayjs("2024-02-01"), actual: null }],
    };
    expect(sortTrantionSequence([far, near] as never)).toEqual([near, far]);
  });
});
