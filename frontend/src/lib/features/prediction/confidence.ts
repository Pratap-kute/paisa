import { CONFIDENCE, IDENTITY } from "./weights";
import type { Confidence, ScoreBreakdown } from "./types";
import type { ScoredAccount } from "./score";

export function strongIdentity(breakdown: ScoreBreakdown): boolean {
  return breakdown.identity >= IDENTITY.EXACT_DESCRIPTION;
}

export function decideConfidence(
  top: ScoredAccount | null,
  margin: number,
  possibleTransfer: boolean,
  source: "HISTORY" | "TFIDF" | "RULE" | "USER" | "UNKNOWN",
): Confidence {
  if (!top || source === "UNKNOWN") return "UNKNOWN";
  if (source === "USER" || source === "RULE") return "HIGH";
  if (source === "TFIDF") {
    if (top.score < CONFIDENCE.UNKNOWN_SCORE) return "UNKNOWN";
    return "NEEDS_REVIEW";
  }

  const onlyWeakFuzzy = top.breakdown.identityKind === "SIMILARITY" &&
    top.breakdown.weakFuzzyPenalty < 0 &&
    top.support <= 1;
  if (onlyWeakFuzzy) return "UNKNOWN";
  if (top.score < CONFIDENCE.UNKNOWN_SCORE) return "UNKNOWN";
  if (top.split || possibleTransfer) return "NEEDS_REVIEW";

  const high = top.score >= CONFIDENCE.HIGH_SCORE &&
    top.support >= CONFIDENCE.HIGH_SUPPORT &&
    margin >= CONFIDENCE.HIGH_MARGIN &&
    strongIdentity(top.breakdown) &&
    !top.split;
  if (high) return "HIGH";
  return "MEDIUM";
}
