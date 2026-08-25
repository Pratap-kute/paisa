import { IDENTITY, MATCH } from "./weights";
import type {
  IndexedPosting,
  NormalizedDescription,
  ReasonCode,
} from "./types";

export interface MerchantMatch {
  posting: IndexedPosting;
  identity: number;
  kind: ReasonCode;
  similarity: number;
}

export function trigrams(text: string): Set<string> {
  const padded = `#${text.replace(/\s+/g, " ")}#`;
  const grams = new Set<string>();
  if (padded.length < 3) {
    if (padded.length > 0) grams.add(padded);
    return grams;
  }
  for (let i = 0; i <= padded.length - 3; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

export function diceCoefficient(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const a = trigrams(left);
  const b = trigrams(right);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const gram of a) {
    if (b.has(gram)) overlap++;
  }
  return (2 * overlap) / (a.size + b.size);
}

export function tokenJaccard(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const b = new Set(right);
  let overlap = 0;
  const union = new Set(left);
  for (const token of left) {
    if (b.has(token)) overlap++;
  }
  for (const token of right) union.add(token);
  return overlap / union.size;
}

export function similarity(
  input: NormalizedDescription,
  other: NormalizedDescription,
): number {
  const exactKey = input.merchantKey && input.merchantKey === other.merchantKey
    ? 1
    : 0;
  const dice = Math.max(
    diceCoefficient(input.merchantKey, other.merchantKey),
    diceCoefficient(input.full, other.full),
  );
  const jaccard = tokenJaccard(input.tokens, other.tokens);
  const containment = tokenContainment(input.tokens, other.tokens);
  return Math.max(exactKey, dice, jaccard, containment);
}

function tokenContainment(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const a = new Set(left);
  const b = new Set(right);
  const aInB = [...a].every((token) => b.has(token));
  const bInA = [...b].every((token) => a.has(token));
  if (!aInB && !bInA) return 0;
  return Math.min(a.size, b.size) / Math.max(a.size, b.size);
}

export function identityFor(
  input: NormalizedDescription,
  posting: IndexedPosting,
): {
  score: number;
  kind: ReasonCode;
  similarity: number;
} {
  const other = posting.normalized;
  if (input.merchantKey && input.merchantKey === other.merchantKey) {
    return {
      score: IDENTITY.EXACT_MERCHANT,
      kind: "EXACT_MERCHANT",
      similarity: 1,
    };
  }
  if (
    input.merchantKey &&
    other.merchantKey &&
    input.merchantKey !== other.merchantKey &&
    compactKey(input.merchantKey) === compactKey(other.merchantKey)
  ) {
    return { score: IDENTITY.ALIAS, kind: "ALIAS", similarity: 1 };
  }
  if (input.full && input.full === other.full) {
    return {
      score: IDENTITY.EXACT_DESCRIPTION,
      kind: "EXACT_DESCRIPTION",
      similarity: 1,
    };
  }
  const sim = similarity(input, other);
  return {
    score: Math.round(sim * IDENTITY.SIMILARITY_MAX),
    kind: "SIMILARITY",
    similarity: sim,
  };
}

function compactKey(value: string): string {
  return value.split(" ").join("");
}

export function matchPosting(
  input: NormalizedDescription,
  posting: IndexedPosting,
): MerchantMatch | null {
  const identity = identityFor(input, posting);
  if (
    identity.kind === "SIMILARITY" &&
    identity.similarity < MATCH.SIMILARITY_INCLUDE
  ) {
    return null;
  }
  if (identity.score <= 0) return null;
  return {
    posting,
    identity: identity.score,
    kind: identity.kind,
    similarity: identity.similarity,
  };
}
