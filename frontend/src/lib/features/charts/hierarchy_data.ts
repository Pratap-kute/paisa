import { sumBy } from "es-toolkit";
import type { Aggregate, PortfolioAggregate } from "$lib/core/utils";
import type { ComparisonBarChartData } from "$lib/shared/charts/echarts/bar_comparison";
import { sortBy } from "$lib/shared/utils/collection";

export interface FinancialHierarchyNode {
  id: string;
  label: string;
  value: number;
  percentage?: number;
  categoryKey?: string;
  metadata?: Record<string, string | number | undefined>;
  children?: FinancialHierarchyNode[];
}

function parentAccount(account: string) {
  const parts = account.split(":");
  return parts.length > 1 ? parts.slice(0, -1).join(":") : undefined;
}

function accountLabel(account: string) {
  return account.split(":").at(-1) ?? account;
}

export function buildAllocationHierarchy(
  aggregates: Record<string, Aggregate>,
): FinancialHierarchyNode[] {
  const nodes = new Map<string, FinancialHierarchyNode>();
  Object.values(aggregates).forEach((aggregate) =>
    nodes.set(aggregate.account, {
      id: aggregate.account,
      label: accountLabel(aggregate.account),
      value: aggregate.market_amount,
      percentage: aggregate.percent,
      categoryKey: aggregate.account.split(":")[1] ?? aggregate.account,
      metadata: { account: aggregate.account },
      children: [],
    })
  );
  const roots: FinancialHierarchyNode[] = [];
  [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)).forEach(
    (node) => {
      const parent = nodes.get(parentAccount(node.id) ?? "");
      if (parent) parent.children!.push(node);
      else roots.push(node);
    },
  );
  const total = (node: FinancialHierarchyNode): number => {
    const childTotal = sumBy(node.children ?? [], total);
    node.value = node.value !== 0 ? node.value : childTotal;
    if (!node.children?.length) delete node.children;
    return node.value;
  };
  roots.forEach(total);
  const grandTotal = sumBy(roots, total);
  const addPercent = (node: FinancialHierarchyNode) => {
    node.percentage = grandTotal === 0 ? 0 : (node.value / grandTotal) * 100;
    node.children?.forEach(addPercent);
  };
  roots.forEach(addPercent);
  return roots;
}

export function filterCommodityBreakdowns(
  portfolioAggregates: PortfolioAggregate[],
  commodities: string[],
): PortfolioAggregate[] {
  const filtered = portfolioAggregates.flatMap((aggregate) => {
    const breakdowns = aggregate.breakdowns
      .filter((breakdown) => commodities.includes(breakdown.commodity_name))
      .map((breakdown) => ({ ...breakdown }));
    return breakdowns.length ? [{ ...aggregate, breakdowns }] : [];
  });
  const total = sumBy(
    filtered,
    (aggregate) => sumBy(aggregate.breakdowns, (b) => b.amount),
  );
  return sortBy(
    filtered.map((aggregate) => {
      aggregate.amount = sumBy(aggregate.breakdowns, (b) => b.amount);
      aggregate.percentage = total === 0 ? 0 : (aggregate.amount / total) * 100;
      aggregate.breakdowns = aggregate.breakdowns.map((breakdown) => ({
        ...breakdown,
        percentage: aggregate.amount === 0
          ? 0
          : (breakdown.amount / aggregate.amount) * 100,
      }));
      return aggregate;
    }),
    (aggregate) => -aggregate.amount,
  );
}

export function buildPortfolioComparison(
  aggregates: PortfolioAggregate[],
): ComparisonBarChartData {
  return {
    valueFormat: "currency",
    valueLabel: "Market value",
    sort: "input",
    points: aggregates.map((aggregate) => ({
      key: aggregate.id,
      label: aggregate.group,
      value: aggregate.amount,
      secondaryValue: aggregate.percentage,
      secondaryLabel: "Share %",
      categoryKey: aggregate.sub_group || aggregate.group,
      tooltipRows: [
        { label: "Market value", value: aggregate.amount, format: "currency" },
        {
          label: "Share",
          value: aggregate.percentage / 100,
          format: "percentage",
        },
      ],
    })),
  };
}

export function buildPortfolioHierarchy(
  aggregates: PortfolioAggregate[],
): FinancialHierarchyNode[] {
  return aggregates.map((aggregate) => ({
    id: aggregate.id,
    label: aggregate.group,
    value: aggregate.amount,
    percentage: aggregate.percentage,
    categoryKey: aggregate.group,
    metadata: { group: aggregate.group, subGroup: aggregate.sub_group },
    children: aggregate.breakdowns.map((breakdown) => ({
      id:
        `${aggregate.id}:${breakdown.security_id}:${breakdown.commodity_name}`,
      label: breakdown.security_name || breakdown.commodity_name,
      value: breakdown.amount,
      percentage: breakdown.percentage,
      categoryKey: aggregate.group,
      metadata: {
        commodity: breakdown.commodity_name,
        security: breakdown.security_name,
        securityType: breakdown.security_type,
      },
    })),
  }));
}

export interface PortfolioHoldingRow {
  rank: number;
  security_name: string;
  security_type: string;
  commodities: string;
  amount: number;
  percentage: number;
}

export function buildFlattenedHoldings(
  aggregates: PortfolioAggregate[],
): PortfolioHoldingRow[] {
  const map = new Map<string, {
    security_name: string;
    security_type: string;
    commodities: Set<string>;
    amount: number;
  }>();

  for (const agg of aggregates) {
    for (const b of agg.breakdowns) {
      const name = b.security_name || b.commodity_name || "Unknown";
      const existing = map.get(name);
      if (existing) {
        existing.amount += b.amount;
        existing.commodities.add(b.commodity_name);
        if (!existing.security_type || existing.security_type === "unknown") {
          existing.security_type = b.security_type || agg.group;
        }
      } else {
        map.set(name, {
          security_name: name,
          security_type: b.security_type || agg.group || "unknown",
          commodities: new Set([b.commodity_name]),
          amount: b.amount,
        });
      }
    }
  }

  const sorted = Array.from(map.values())
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const grandTotal = sumBy(sorted, (item) => item.amount);

  return sorted.map((item, index) => ({
    rank: index + 1,
    security_name: item.security_name,
    security_type: item.security_type,
    commodities: Array.from(item.commodities).filter(Boolean).join(", "),
    amount: item.amount,
    percentage: grandTotal > 0 ? (item.amount / grandTotal) * 100 : 0,
  }));
}

export function buildTopHoldingsComparison(
  holdings: PortfolioHoldingRow[],
  limit = 10,
): ComparisonBarChartData {
  const topHoldings = holdings.slice(0, limit);
  return {
    valueFormat: "currency",
    valueLabel: "Market value",
    sort: "input",
    points: topHoldings.map((h) => ({
      key: h.security_name,
      label: h.security_name,
      value: h.amount,
      secondaryValue: h.percentage,
      secondaryLabel: "Share %",
      categoryKey: h.security_type,
      tooltipRows: [
        { label: "Market value", value: h.amount, format: "currency" },
        { label: "Share", value: h.percentage / 100, format: "percentage" },
      ],
    })),
  };
}

export function buildAllocationCategoryComparison(
  roots: FinancialHierarchyNode[],
): ComparisonBarChartData {
  const sorted = [...roots].sort((a, b) => b.value - a.value);
  return {
    valueFormat: "currency",
    valueLabel: "Market value",
    sort: "input",
    points: sorted.map((root) => ({
      key: root.id,
      label: root.label,
      value: root.value,
      secondaryValue: root.percentage ?? 0,
      secondaryLabel: "Share %",
      categoryKey: root.categoryKey ?? root.label,
      tooltipRows: [
        { label: "Market value", value: root.value, format: "currency" },
        {
          label: "Share",
          value: (root.percentage ?? 0) / 100,
          format: "percentage",
        },
      ],
    })),
  };
}
