import _ from "lodash";
import type { Aggregate, PortfolioAggregate } from "$lib/core/utils";
import type { ComparisonBarChartData } from "$lib/charts/echarts/bar_comparison";

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
    const childTotal = _.sumBy(node.children ?? [], total);
    node.value = node.value !== 0 ? node.value : childTotal;
    if (!node.children?.length) delete node.children;
    return node.value;
  };
  roots.forEach(total);
  const grandTotal = _.sumBy(roots, total);
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
  const filtered = _.flatMap(_.cloneDeep(portfolioAggregates), (aggregate) => {
    aggregate.breakdowns = aggregate.breakdowns.filter((breakdown) =>
      commodities.includes(breakdown.commodity_name)
    );
    return aggregate.breakdowns.length ? [aggregate] : [];
  });
  const total = _.sumBy(
    filtered,
    (aggregate) => _.sumBy(aggregate.breakdowns, "amount"),
  );
  return _.sortBy(
    filtered.map((aggregate) => {
      aggregate.amount = _.sumBy(aggregate.breakdowns, "amount");
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
    categoryKey: aggregate.sub_group || aggregate.group,
    metadata: { group: aggregate.group, subGroup: aggregate.sub_group },
    children: aggregate.breakdowns.map((breakdown) => ({
      id:
        `${aggregate.id}:${breakdown.security_id}:${breakdown.commodity_name}`,
      label: breakdown.security_name || breakdown.commodity_name,
      value: breakdown.amount,
      percentage: breakdown.percentage,
      categoryKey: breakdown.commodity_name,
      metadata: {
        commodity: breakdown.commodity_name,
        security: breakdown.security_name,
        securityType: breakdown.security_type,
      },
    })),
  }));
}
