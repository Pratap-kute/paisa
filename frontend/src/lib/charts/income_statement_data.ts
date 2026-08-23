import type { IncomeStatement } from "$lib/core/utils";

export type IncomeStatementCategory =
  | "start"
  | "income"
  | "tax"
  | "interest"
  | "pnl"
  | "equity"
  | "liabilities"
  | "expenses"
  | "end";

export interface WaterfallBreakdown {
  account: string;
  value: number;
}
export interface WaterfallStep {
  id: IncomeStatementCategory;
  label: string;
  start: number;
  delta: number;
  end: number;
  breakdown: WaterfallBreakdown[];
}
export interface IncomeStatementWaterfallData {
  steps: WaterfallStep[];
  endingBalance: number;
}

const sum = (values: Record<string, number>) =>
  Object.values(values).reduce((acc, v) => acc + v, 0);

export function buildIncomeStatementWaterfall(
  statement: IncomeStatement,
): IncomeStatementWaterfallData {
  const definitions: Array<
    [IncomeStatementCategory, string, Record<string, number>, number]
  > = [
    ["income", "Income", statement.income, -1],
    ["tax", "Tax", statement.tax, -1],
    ["interest", "Interest", statement.interest, -1],
    ["pnl", "Gain / Loss", statement.pnl, 1],
    ["equity", "Equity", statement.equity, -1],
    ["liabilities", "Liabilities", statement.liabilities, -1],
    ["expenses", "Expenses", statement.expenses, -1],
  ];
  let current = statement.startingBalance;
  const steps: WaterfallStep[] = [{
    id: "start",
    label: "Starting balance",
    start: 0,
    delta: statement.startingBalance,
    end: statement.startingBalance,
    breakdown: [],
  }];
  for (const [id, label, values, multiplier] of definitions) {
    const delta = sum(values) * multiplier;
    const start = current;
    current += delta;
    steps.push({
      id,
      label,
      start,
      delta,
      end: current,
      breakdown: Object.entries(values).sort(([a], [b]) => a.localeCompare(b))
        .map(([account, value]) => ({ account, value: value * multiplier })),
    });
  }
  steps.push({
    id: "end",
    label: "Ending balance",
    start: 0,
    delta: statement.endingBalance,
    end: statement.endingBalance,
    breakdown: [],
  });
  return { steps, endingBalance: statement.endingBalance };
}
