import { CONFIDENCE } from "./weights";

export const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  NEEDS_REVIEW: "Needs review",
  UNKNOWN: "Unknown",
};

const REASON_COPY: Record<string, string> = {
  USER: "Set manually for this import",
  RULE: "Matched a merchant rule",
  EXACT_MERCHANT: "Exact merchant match",
  ALIAS: "Matched a known merchant alias",
  EXACT_DESCRIPTION: "Same description as a prior posting",
  SIMILARITY: "Similar to a prior merchant",
  HISTORY: "Supported by committed history",
  SOURCE: "Same counterpart account",
  DIRECTION: "Same amount direction",
  CURRENCY: "Currency considered",
  AMOUNT: "Similar amount",
  RECENCY: "Recent similar posting",
  GENERIC: "Generic merchant text",
  WEAK_FUZZY: "Only a weak fuzzy match",
  SPLIT: "History is split across accounts",
  TRANSFER: "Looks like a possible transfer",
  PREFIX: "Limited to the template prefix",
  TFIDF: "Legacy keyword fallback",
  UNKNOWN: "No confident account match",
};

export function reasonLabel(code: string): string {
  return REASON_COPY[code] || code;
}

export function confidenceLabel(confidence: string): string {
  return CONFIDENCE_LABEL[confidence] || confidence;
}

export function shortReasons(codes: string[], limit = 3): string[] {
  const unique = [...new Set(codes)];
  return unique.slice(0, limit).map(reasonLabel);
}

export { CONFIDENCE };
