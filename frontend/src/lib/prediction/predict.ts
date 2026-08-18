import { decideConfidence } from "./confidence";
import { normalizeDescription } from "./normalize";
import {
  applyMerchantRule,
  debugBreakdown,
  emptyBreakdown,
  scoreAccounts,
  toCandidates,
  unknownAccount,
} from "./score";
import { detectTransfer } from "./transfer";
import { IDENTITY } from "./weights";
import type {
  CurrentImportContext,
  PredictionIndex,
  PredictionInput,
  PredictionOptions,
  PredictionResult,
} from "./types";

export function predict(
  input: PredictionInput,
  options: PredictionOptions,
  index: PredictionIndex,
  currentImport: CurrentImportContext = { rows: [] },
): PredictionResult {
  try {
    return predictUnsafe(input, options, index, currentImport);
  } catch (_error) {
    return unknownResult(input, "UNKNOWN");
  }
}

function predictUnsafe(
  input: PredictionInput,
  options: PredictionOptions,
  index: PredictionIndex,
  currentImport: CurrentImportContext,
): PredictionResult {
  const normalized = normalizeDescription(input.description);
  const possibleTransfer = detectTransfer(input, currentImport);
  const rule = applyMerchantRule(input, options.merchantRules);
  if (rule) {
    const breakdown = emptyBreakdown();
    breakdown.identity = IDENTITY.RULE;
    breakdown.identityKind = "RULE";
    breakdown.total = IDENTITY.RULE;
    return {
      account: rule.account,
      confidence: "HIGH",
      score: IDENTITY.RULE,
      support: 1,
      margin: IDENTITY.RULE,
      reasons: ["RULE"],
      alternatives: [],
      possibleTransfer,
      merchantKey: normalized.merchantKey,
      source: "RULE",
      breakdown,
      debug: debugBreakdown(rule.account, breakdown, IDENTITY.RULE),
      prefix: input.prefix,
      rowIndex: input.rowIndex,
      helperInvocationIndex: input.helperInvocationIndex ?? 0,
    };
  }

  const scored = scoreAccounts(input, index);
  if (scored.length === 0) {
    const result = unknownResult(
      input,
      possibleTransfer ? "TRANSFER" : "UNKNOWN",
    );
    result.possibleTransfer = possibleTransfer;
    result.merchantKey = normalized.merchantKey;
    return result;
  }

  const top = scored[0];
  const second = scored[1];
  const margin = second ? top.score - second.score : top.score;
  const confidence = decideConfidence(
    top,
    margin,
    possibleTransfer,
    "HISTORY",
  );
  const account = confidence === "UNKNOWN"
    ? unknownAccount(input.prefix)
    : top.account;
  const reasons = [...top.reasons];
  if (possibleTransfer) reasons.push("TRANSFER");
  if (confidence === "UNKNOWN") reasons.push("UNKNOWN");

  return {
    account,
    confidence,
    score: top.score,
    support: top.support,
    margin,
    reasons,
    alternatives: toCandidates(
      scored.slice(confidence === "UNKNOWN" ? 0 : 1),
      3,
    ),
    possibleTransfer,
    merchantKey: normalized.merchantKey,
    source: confidence === "UNKNOWN" ? "UNKNOWN" : "HISTORY",
    breakdown: top.breakdown,
    debug: debugBreakdown(account, top.breakdown, margin),
    prefix: input.prefix,
    rowIndex: input.rowIndex,
    helperInvocationIndex: input.helperInvocationIndex ?? 0,
  };
}

export function unknownResult(
  input: PredictionInput,
  reason: "UNKNOWN" | "TRANSFER" = "UNKNOWN",
): PredictionResult {
  const normalized = normalizeDescription(input.description);
  const account = unknownAccount(input.prefix);
  const breakdown = emptyBreakdown();
  return {
    account,
    confidence: "UNKNOWN",
    score: 0,
    support: 0,
    margin: 0,
    reasons: reason === "TRANSFER" ? ["TRANSFER", "UNKNOWN"] : ["UNKNOWN"],
    alternatives: [],
    possibleTransfer: reason === "TRANSFER",
    merchantKey: normalized.merchantKey,
    source: "UNKNOWN",
    breakdown,
    debug: debugBreakdown(account, breakdown, 0),
    prefix: input.prefix,
    rowIndex: input.rowIndex,
    helperInvocationIndex: input.helperInvocationIndex ?? 0,
  };
}
