import type { CashFlow } from "$lib/domain/cash_flow";
import type { PeriodSeriesChartData } from "$lib/shared/charts/echarts/period_series";
import { categoryColorResolver } from "$lib/shared/charts/category";

export function buildCashFlowSeries(
  cashFlows: CashFlow[],
): PeriodSeriesChartData {
  const definitions = [
    ["income", "Income", "source"],
    ["liability-source", "Liabilities received", "source"],
    ["investment-source", "Investment withdrawal", "source"],
    ["expenses", "Expenses", "use"],
    ["tax", "Tax", "use"],
    ["investment-use", "Investment", "use"],
    ["liability-use", "Liabilities repaid", "use"],
  ] as const;
  const legendColor = categoryColorResolver(
    definitions.map(([key]) => key),
  );
  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    legends: [
      ...definitions.map(([key, label]) => ({
        label,
        color: legendColor(key),
        shape: "square" as const,
        symbol: key === "tax" ? "diagonal-stripe" as const : undefined,
      })),
      {
        label: "Checking Balance",
        color: "var(--paisa-primary)",
        shape: "line",
      },
    ],
    series: [
      ...definitions.map(([key, label, stack]) => ({
        key,
        label,
        intent: "stacked-bar" as const,
        stack,
        categoryKey: key,
        decal: key === "tax",
      })),
      {
        key: "balance",
        label: "Checking Balance",
        intent: "line" as const,
        color: "var(--paisa-primary)",
        showSymbol: false,
      },
    ],
    points: cashFlows.map((flow) => ({
      period: flow.date.format("MMM YYYY"),
      timestamp: flow.date.valueOf(),
      values: {
        income: flow.income,
        "liability-source": Math.max(flow.liabilities, 0),
        "investment-source": Math.max(-flow.investment, 0),
        expenses: flow.expenses,
        tax: flow.tax,
        "investment-use": Math.max(flow.investment, 0),
        "liability-use": Math.max(-flow.liabilities, 0),
        balance: flow.balance,
      },
      tooltipRows: [
        ["Income", flow.income],
        ["Liabilities", flow.liabilities],
        ["Expenses", flow.expenses],
        ["Tax", flow.tax],
        ["Investment", flow.investment],
        ["Checking", flow.checking],
        ["Checking Balance", flow.balance],
      ],
    })),
  };
}
