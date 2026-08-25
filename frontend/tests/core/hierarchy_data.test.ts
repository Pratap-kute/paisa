import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  buildAllocationHierarchy,
  buildPortfolioComparison,
  buildPortfolioHierarchy,
  filterCommodityBreakdowns,
} from "$lib/features/charts/hierarchy_data";
import type { Aggregate, PortfolioAggregate } from "$lib/core/utils";

describe("financial hierarchy adapters", () => {
  it("preserves allocation hierarchy and derives parent values without double counting", () => {
    const aggregate = (account: string, market_amount: number): Aggregate => ({
      date: dayjs(),
      account,
      market_amount,
      percent: 0,
    });
    const roots = buildAllocationHierarchy({
      Assets: aggregate("Assets", 0),
      Equity: aggregate("Assets:Equity", 0),
      Broker: aggregate("Assets:Equity:Broker", 600),
      Debt: aggregate("Assets:Debt", 400),
    });
    expect(roots).toHaveLength(1);
    expect(roots[0].value).toBe(1000);
    expect(roots[0].children?.map((node) => [node.id, node.value])).toEqual([
      ["Assets:Debt", 400],
      ["Assets:Equity", 600],
    ]);
    expect(roots[0].children?.[0].percentage).toBe(40);
  });

  const portfolio: PortfolioAggregate[] = [{
    id: "Equity",
    group: "Equity",
    sub_group: "Growth",
    amount: 100,
    percentage: 100,
    breakdowns: [
      {
        commodity_name: "FUND-A",
        security_name: "Alpha",
        security_id: "A",
        security_type: "Stock",
        amount: 60,
        percentage: 60,
      },
      {
        commodity_name: "FUND-B",
        security_name: "Beta",
        security_id: "B",
        security_type: "Stock",
        amount: 40,
        percentage: 40,
      },
    ],
  }];

  it("preserves commodity filtering and recalculates visible shares", () => {
    const filtered = filterCommodityBreakdowns(portfolio, ["FUND-B"]);
    expect(filtered[0]).toMatchObject({ amount: 40, percentage: 100 });
    expect(filtered[0].breakdowns[0]).toMatchObject({
      commodity_name: "FUND-B",
      percentage: 100,
    });
    expect(portfolio[0].breakdowns).toHaveLength(2);
  });

  it("filters reactive proxy arrays without structured-clone errors", () => {
    const reactivePortfolio = new Proxy(portfolio, {});
    const filtered = filterCommodityBreakdowns(reactivePortfolio, ["FUND-A"]);

    expect(filtered[0]).toMatchObject({ amount: 60, percentage: 100 });
    expect(filtered[0].breakdowns[0]).toMatchObject({
      commodity_name: "FUND-A",
      percentage: 100,
    });
    expect(portfolio[0].breakdowns).toHaveLength(2);
  });

  it("creates flat comparison and parent/commodity hierarchy contracts", () => {
    const comparison = buildPortfolioComparison(portfolio);
    expect(comparison.points[0]).toMatchObject({
      key: "Equity",
      value: 100,
      categoryKey: "Growth",
    });
    expect(comparison.points[0].tooltipRows?.map((row) => row.value)).toEqual([
      100,
      1,
    ]);
    const hierarchy = buildPortfolioHierarchy(portfolio);
    expect(hierarchy[0].children?.map((node) => [node.label, node.value]))
      .toEqual([
        ["Alpha", 60],
        ["Beta", 40],
      ]);
    expect(hierarchy[0].children?.[0].metadata?.commodity).toBe("FUND-A");
  });
});
