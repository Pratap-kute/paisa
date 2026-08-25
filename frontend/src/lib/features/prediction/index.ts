import { normalizeDescription } from "./normalize";
import type { HistoryPosting, IndexedPosting, PredictionIndex } from "./types";

export function buildIndex(history: HistoryPosting[]): PredictionIndex {
  const postings: IndexedPosting[] = [];
  const byMerchant = new Map<string, IndexedPosting[]>();
  const byNormalized = new Map<string, IndexedPosting[]>();
  const accounts = new Set<string>();

  for (const row of history) {
    const indexed: IndexedPosting = {
      payee: row.payee,
      normalized: normalizeDescription(row.payee),
      account: row.categoryAccount,
      sourceAccount: row.sourceAccount,
      amount: row.amount,
      absoluteAmount: row.absoluteAmount ?? Math.abs(row.amount),
      direction: row.direction,
      date: row.date,
      commodity: row.commodity,
      transactionId: row.transactionId,
    };
    postings.push(indexed);
    accounts.add(row.categoryAccount);
    pushMap(byMerchant, indexed.normalized.merchantKey, indexed);
    pushMap(byNormalized, indexed.normalized.full, indexed);
  }

  return {
    postings,
    byMerchant,
    byNormalized,
    accounts: [...accounts].sort(),
  };
}

function pushMap(
  map: Map<string, IndexedPosting[]>,
  key: string,
  posting: IndexedPosting,
) {
  if (!key) return;
  const list = map.get(key);
  if (list) {
    list.push(posting);
  } else {
    map.set(key, [posting]);
  }
}
