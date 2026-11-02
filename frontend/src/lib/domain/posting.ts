import type { Posting } from "#lib/domain/ledger";

export interface Change {
  class: string;
  // Unrealized gain of the lot; zero when it has none.
  value: number;
  // Compound annual rate in percent; undefined for lots held under a year.
  annualizedReturn?: number;
  days: number;
}

// The backend owns the return calculation; this only reads it and picks a
// colour class.
export function change(p: Posting): Change {
  const value = p.unrealized_gain ?? 0;
  return {
    class:
      value > 0 ? "paisa-text-success" : value < 0 ? "paisa-text-danger" : "",
    value,
    annualizedReturn: p.annualized_return,
    days: p.holding_days ?? 0,
  };
}
