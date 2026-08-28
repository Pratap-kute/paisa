import type dayjs from "dayjs";

export interface Insight {
  id: string;
  type: string;
  category: string;
  severity: string;
  score: number;
  value?: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  baselineQuality?: "normal" | "low_baseline" | "no_baseline";
  baselineMethod?: "previous_period" | "rolling_median";
  baselineValue?: number;
  baselineSampleCount?: number;
  investmentContribution?: number;
  gainContribution?: number;
  period?: string;
  comparisonPeriod?: string;
  account?: string;
  relatedAccounts?: string[];
  href?: string;
}

export interface InsightsResult {
  period: string;
  comparisonPeriod?: string;
  asOf: dayjs.Dayjs;
  isPartial?: boolean;
  insights: Insight[];
}

export type InsightCategoryFilter =
  | "all"
  | "spending"
  | "savings"
  | "networth"
  | "budget"
  | "recurring"
  | "investment"
  | "cash";

export const INSIGHT_CATEGORIES: {
  id: InsightCategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "spending", label: "Spending" },
  { id: "savings", label: "Savings" },
  { id: "networth", label: "Net Worth" },
  { id: "budget", label: "Budget" },
  { id: "recurring", label: "Recurring" },
  { id: "investment", label: "Investments" },
  { id: "cash", label: "Cash" },
];
