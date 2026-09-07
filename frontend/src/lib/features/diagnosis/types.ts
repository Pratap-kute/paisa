import type {
  DtoDiagnosisResponse,
  DtoDiagnosisSummaryResponse,
  DtoDiagnosticCheckResponse,
  DtoIssueAction,
  DtoIssueEntity,
  DtoIssueResponse,
} from "$lib/api/generated/Api";

export type QualityLevel = "danger" | "warning" | "info";
export type QualityCategory =
  | "ledger"
  | "valuation"
  | "investments"
  | "allocation"
  | "configuration"
  | "history"
  | "transactions";

export type CheckStatus = "passed" | "issues" | "failed";

export type DiagnosisResponse = DtoDiagnosisResponse;
export type DiagnosisSummary = DtoDiagnosisSummaryResponse;
export type DiagnosticCheck = DtoDiagnosticCheckResponse;
export type QualityIssue = DtoIssueResponse;
export type IssueEntity = DtoIssueEntity;
export type IssueAction = DtoIssueAction;

// Backwards compatibility alias for existing consumers
export type Issue = QualityIssue;

export const FEATURE_LABELS: Record<string, string> = {
  net_worth: "Net Worth",
  balance_sheet: "Balance Sheet",
  income_statement: "Income Statement",
  investment_performance: "Investment Performance",
  scenarios: "Scenario Planning",
  allocation: "Asset Allocation",
  commodities: "Commodities",
};

export function formatFeatureName(feature: string): string {
  return FEATURE_LABELS[feature] || feature;
}
