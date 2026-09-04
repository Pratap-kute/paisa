import { groupBy as groupByItems, mapValues, sumBy } from "es-toolkit";
import type { Posting, Transaction } from "$lib/domain/ledger";
import { max } from "$lib/shared/utils/collection";
export function sumPostings(postings: Posting[]) {
  return postings.reduce(
    (
      sum,
      p,
    ) => (p.account.startsWith("Income:CapitalGains")
      ? sum + -p.amount
      : sum + p.amount),
    0,
  );
}

export function transactionTotal(transaction: Transaction) {
  return sumBy(transaction.postings, (t) => max([0, t.amount]) ?? 0);
}

export function groupSumBy(
  postings: Posting[],
  groupBy: ((posting: Posting) => string) | keyof Posting | string,
) {
  const fn: (posting: Posting) => PropertyKey = typeof groupBy === "function"
    ? groupBy
    : (p: Posting) =>
      (p as unknown as Record<string, PropertyKey>)[groupBy as string];
  return mapValues(
    groupByItems(postings, fn),
    (ps) => sumBy(ps, (p) => p.amount),
  );
}

export function asTransaction(p: Posting): Transaction {
  return {
    id: p.id,
    date: p.date,
    payee: p.payee,
    beginLine: p.transaction_begin_line,
    endLine: p.transaction_end_line,
    fileName: p.file_name,
    note: p.transaction_note,
    postings: [p],
  };
}
