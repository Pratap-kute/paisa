import { secondName } from "$lib/domain/account";
import { groupBy, mapValues, sumBy } from "es-toolkit";
import type { Posting } from "$lib/domain/ledger";

export function byExpenseGroup(expenses: Posting[]) {
  return mapValues(
    groupBy(expenses, expenseGroup),
    (ps, category) => ({
      category: category,
      postings: ps,
      total: sumBy(ps, (p) => p.amount),
    }),
  );
}

export function expenseGroup(posting: Posting) {
  return secondName(posting.account);
}
