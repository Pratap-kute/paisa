import { get } from "svelte/store";
import { cosineSimilarity } from "$lib/core/cosine_similarity";
import { accountTfIdf } from "$lib/state/store";
import { CONFIDENCE } from "./weights";
import type { PredictionInput, PredictionResult } from "./types";
import { accountMatchesPrefix, debugBreakdown, emptyBreakdown } from "./score";
import { normalizeDescription } from "./normalize";

function tokenize(s: string): Record<string, number> {
  const tokens = s
    .split(/[ .()/:]+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token.trim() !== "");
  const counts: Record<string, number> = {};
  for (const token of tokens) {
    counts[token] = (counts[token] || 0) + 1;
  }
  return counts;
}

function tfidf(query: string): Record<string, number> {
  const snapshot = get(accountTfIdf);
  if (snapshot == null) return {};
  const { index } = snapshot;
  const tokens = tokenize(query);
  const tokenKeys = Object.keys(tokens);
  const result: Record<string, number> = {};
  for (const token of tokenKeys) {
    const tf = tokens[token] / tokenKeys.length;
    const idf = Math.log(
      Object.keys(index.docs).length /
        (1 + Object.keys(index.tokens[token] || []).length),
    ) + 1;
    result[token] = tf * idf;
  }
  return result;
}

export function findTfidfMatches(query: string): [string, number][] {
  const snapshot = get(accountTfIdf);
  if (snapshot == null) return [];
  const queryVector = tfidf(query);
  const { tf_idf, index } = snapshot;
  const accounts = Object.keys(index.docs);
  const scored: [string, number][] = [];
  for (const account of accounts) {
    const tokens = [
      ...new Set([
        ...Object.keys(queryVector),
        ...Object.keys(tf_idf[account] || {}),
      ]),
    ];
    const q = tokens.map((token) => queryVector[token] || 0);
    const a = tokens.map((token) => tf_idf[account]?.[token] || 0);
    const score = cosineSimilarity(q, a);
    if (score > 0) scored.push([account, score]);
  }
  scored.sort((left, right) => right[1] - left[1]);
  return scored;
}

/** Legacy fallback only. Cannot produce HIGH. */
export function tfidfFallback(input: PredictionInput): PredictionResult | null {
  const matches = findTfidfMatches(input.description);
  const match = matches.find(([account]) =>
    accountMatchesPrefix(account, input.prefix)
  );
  if (!match) return null;
  const cosine = match[1];
  const score = Math.min(CONFIDENCE.HIGH_SCORE - 1, cosine * 70);
  const normalized = normalizeDescription(input.description);
  const breakdown = emptyBreakdown();
  breakdown.identity = score;
  breakdown.identityKind = "TFIDF";
  breakdown.total = score;
  return {
    account: match[0],
    confidence: score >= CONFIDENCE.UNKNOWN_SCORE ? "NEEDS_REVIEW" : "UNKNOWN",
    score,
    support: 1,
    margin: score,
    reasons: ["TFIDF"],
    alternatives: [],
    possibleTransfer: false,
    merchantKey: normalized.merchantKey,
    source: "TFIDF",
    breakdown,
    debug: debugBreakdown(match[0], breakdown, score),
    prefix: input.prefix,
    rowIndex: input.rowIndex,
    helperInvocationIndex: input.helperInvocationIndex ?? 0,
  };
}
