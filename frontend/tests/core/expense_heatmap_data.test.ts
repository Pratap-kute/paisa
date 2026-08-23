import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  buildMonthlyExpenseHeatmapData,
  buildYearlyExpenseHeatmapData,
} from "$lib/charts/expense_heatmap_data";
import type { Posting } from "$lib/core/utils";

function posting(
  date: string,
  account: string,
  amount: number,
  payee = account,
): Posting {
  return { date: dayjs(date), account, amount, payee } as Posting;
}

describe("expense heatmap adapters", () => {
  it("preserves daily totals, detail rows, filters, and missing days", () => {
    const data = buildMonthlyExpenseHeatmapData("2024-02", [
      posting("2024-02-01", "Expenses:Food:Groceries", 100, "Market"),
      posting("2024-02-01", "Expenses:Travel:Taxi", 50, "Cab"),
      posting("2024-02-02", "Expenses:Food:Dining", 0, "Voucher"),
    ], ["Food"]);
    expect(data.points).toHaveLength(29);
    expect(data.points[0]).toMatchObject({
      key: "2024-02-01",
      value: 100,
      hasActivity: true,
    });
    expect(data.points[0].tooltipRows[0]).toMatchObject({
      label: "Market",
      value: 100,
    });
    expect(data.points[0].segments).toEqual([{ key: "Food", value: 100 }]);
    expect(data.points[1]).toMatchObject({ value: 0, hasActivity: true });
    expect(data.points[2]).toMatchObject({ value: 0, hasActivity: false });
    expect(data.maxValue).toBe(100);
  });

  it("preserves daily category composition for calendar rings", () => {
    const data = buildMonthlyExpenseHeatmapData("2024-03", [
      posting("2024-03-05", "Expenses:Food:Groceries", 75),
      posting("2024-03-05", "Expenses:Travel:Taxi", 25),
      posting("2024-03-05", "Expenses:Food:Dining", 25),
    ]);

    expect(data.points[4].value).toBe(125);
    expect(data.points[4].segments).toEqual([
      { key: "Food", value: 100 },
      { key: "Travel", value: 25 },
    ]);
  });

  it.each([
    ["2023-02", 28],
    ["2024-02", 29],
    ["2024-04", 30],
    ["2024-01", 31],
  ])("creates the exact dates for %s", (month, days) => {
    const data = buildMonthlyExpenseHeatmapData(month, []);
    expect(data.points).toHaveLength(days);
    expect(data.points[0].key).toBe(`${month}-01`);
    expect(data.points.at(-1)?.key).toBe(`${month}-${days}`);
  });

  it("preserves financial-year month order, totals, and category rows", () => {
    const data = buildYearlyExpenseHeatmapData(
      "2023-2024",
      [
        posting("2023-04-10", "Expenses:Food:Groceries", 100),
        posting("2023-04-11", "Expenses:Travel:Taxi", 50),
        posting("2024-03-01", "Expenses:Food:Dining", 25),
      ],
      [],
      4,
    );
    expect(data.points).toHaveLength(12);
    expect(data.points[0]).toMatchObject({ key: "2023-04", value: 150 });
    expect(data.points.at(-1)).toMatchObject({ key: "2024-03", value: 25 });
    expect(data.points[0].tooltipRows.map((row) => [row.label, row.value]))
      .toEqual([
        ["Food", 100],
        ["Travel", 50],
      ]);
    expect(data.points[0].segments).toEqual([
      { key: "Food", value: 100 },
      { key: "Travel", value: 50 },
    ]);
    expect(data.points[5]).toMatchObject({
      key: "2023-09",
      value: 0,
      hasActivity: false,
      segments: [],
    });
  });
});
