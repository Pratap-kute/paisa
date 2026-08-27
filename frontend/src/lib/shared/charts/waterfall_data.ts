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
