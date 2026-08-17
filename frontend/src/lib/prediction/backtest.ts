import { buildIndex } from "./index";
import { predict } from "./predict";
import type { HistoryPosting, PredictionOptions } from "./types";

export interface BacktestResult {
  total: number;
  correct: number;
  skipped: number;
  byConfidence: Record<string, number>;
}

export function backtest(
  history: HistoryPosting[],
  options: PredictionOptions = {},
): BacktestResult {
  const ordered = [...history].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const byConfidence: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 0,
    NEEDS_REVIEW: 0,
    UNKNOWN: 0,
  };
  let total = 0;
  let correct = 0;
  let skipped = 0;

  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    const prior = ordered.slice(0, i);
    if (prior.length === 0) {
      skipped += 1;
      continue;
    }
    const index = buildIndex(prior);
    const result = predict(
      {
        description: current.payee,
        amount: current.amount,
        date: current.date,
        commodity: current.commodity,
        prefix: prefixOf(current.categoryAccount),
      },
      options,
      index,
    );
    total += 1;
    byConfidence[result.confidence] = (byConfidence[result.confidence] || 0) +
      1;
    if (result.account === current.categoryAccount) correct += 1;
  }

  return { total, correct, skipped, byConfidence };
}

function prefixOf(account: string): string {
  const parts = account.split(":");
  return parts[0] || "";
}
