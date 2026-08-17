import { matchPosting } from "./merchant";
import { isGenericMerchant, normalizeDescription } from "./normalize";
import { CONFIDENCE, CONTEXT, IDENTITY, MATCH, PENALTY } from "./weights";
import type {
  AccountCandidate,
  AmountDirection,
  IndexedPosting,
  MerchantRule,
  PredictionIndex,
  PredictionInput,
  ReasonCode,
  ScoreBreakdown,
} from "./types";

export interface ScoredAccount {
  account: string;
  score: number;
  support: number;
  reasons: ReasonCode[];
  breakdown: ScoreBreakdown;
  split: boolean;
}

export function normalizePrefix(prefix: string): string {
  return prefix.replace(/:+$/, "");
}

export function accountMatchesPrefix(account: string, prefix: string): boolean {
  if (!prefix) return true;
  const normalized = normalizePrefix(prefix);
  if (!normalized) return true;
  return account === normalized || account.startsWith(normalized + ":");
}

export function unknownAccount(prefix: string): string {
  if (prefix.endsWith(":")) {
    return prefix + "Unknown";
  }
  return prefix + ":Unknown";
}

export function emptyBreakdown(): ScoreBreakdown {
  return {
    identity: 0,
    identityKind: null,
    history: 0,
    supportBonus: 0,
    source: 0,
    direction: 0,
    currency: 0,
    amount: 0,
    recency: 0,
    genericPenalty: 0,
    weakFuzzyPenalty: 0,
    total: 0,
  };
}

export function applyMerchantRule(
  input: PredictionInput,
  rules: MerchantRule[] | undefined,
): { account: string; score: number } | null {
  if (!rules || rules.length === 0) return null;
  const normalized = normalizeDescription(input.description);
  for (const rule of rules) {
    const ruleNorm = normalizeDescription(rule.merchant);
    if (!ruleNorm.merchantKey || !rule.account) continue;
    if (!accountMatchesPrefix(rule.account, input.prefix)) continue;
    if (normalized.merchantKey === ruleNorm.merchantKey) {
      return { account: rule.account, score: IDENTITY.RULE };
    }
  }
  return null;
}

function majoritySignal(
  values: boolean[],
): "match" | "conflict" | "unavailable" {
  if (values.length === 0) return "unavailable";
  const hits = values.filter(Boolean).length;
  return hits >= values.length / 2 ? "match" : "conflict";
}

export function scoreAccounts(
  input: PredictionInput,
  index: PredictionIndex,
): ScoredAccount[] {
  const normalized = normalizeDescription(input.description);
  const matches: {
    posting: IndexedPosting;
    identity: number;
    kind: ReasonCode;
    similarity: number;
  }[] = [];

  for (const posting of index.postings) {
    if (!accountMatchesPrefix(posting.account, input.prefix)) continue;
    const match = matchPosting(normalized, posting);
    if (match) matches.push(match);
  }

  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const list = grouped.get(match.posting.account) || [];
    list.push(match);
    grouped.set(match.posting.account, list);
  }

  const matchedCount = matches.length;
  const scored: ScoredAccount[] = [];

  for (const [account, group] of grouped) {
    const identity = group.reduce((best, item) =>
      item.identity > best.identity ? item : best
    );
    const support = group.length;
    const ratio = matchedCount > 0 ? support / matchedCount : 0;
    const countFactor = Math.min(1, support / 2);
    const history = CONTEXT.HISTORY_MAX * ratio * countFactor;
    const supportBonus = Math.min(
      CONTEXT.SUPPORT_BONUS_MAX,
      Math.max(0, (support - 1) * 5),
    );

    let source = 0;
    if (input.sourceAccount) {
      const known = group
        .map((item) => item.posting.sourceAccount)
        .filter((value): value is string => !!value);
      const signal = majoritySignal(
        known.map((value) => value === input.sourceAccount),
      );
      if (signal === "match") source = CONTEXT.SAME_SOURCE;
      else if (signal === "conflict") source = -CONTEXT.SAME_SOURCE;
    }

    let direction = 0;
    if (input.direction) {
      const known = group
        .map((item) => item.posting.direction)
        .filter((value): value is AmountDirection => !!value);
      const signal = majoritySignal(
        known.map((value) => value === input.direction),
      );
      if (signal === "match") direction = CONTEXT.SAME_DIRECTION;
      else if (signal === "conflict") direction = CONTEXT.OPPOSITE_DIRECTION;
    }

    let currency = 0;
    if (input.commodity) {
      const known = group
        .map((item) => item.posting.commodity)
        .filter((value) => !!value);
      const signal = majoritySignal(
        known.map((value) => value === input.commodity),
      );
      if (signal === "match") currency = CONTEXT.SAME_CURRENCY;
      else if (signal === "conflict") currency = CONTEXT.CURRENCY_MISMATCH;
    }

    let amount = 0;
    const inputAbs = input.amount != null && Number.isFinite(input.amount)
      ? Math.abs(input.amount)
      : undefined;
    if (inputAbs != null && inputAbs !== 0) {
      let best = 0;
      for (const item of group) {
        const postingAbs = item.posting.absoluteAmount ||
          Math.abs(item.posting.amount);
        if (postingAbs === 0) continue;
        const rel = Math.abs(postingAbs - inputAbs) /
          Math.max(postingAbs, inputAbs);
        best = Math.max(
          best,
          1 - Math.min(1, rel / MATCH.AMOUNT_RELATIVE_SCALE),
        );
      }
      amount = CONTEXT.AMOUNT_MAX * best;
    }

    let recency = 0;
    if (input.date) {
      const inputMs = Date.parse(input.date);
      if (!Number.isNaN(inputMs)) {
        let newest = Infinity;
        for (const item of group) {
          const ms = Date.parse(item.posting.date);
          if (Number.isNaN(ms)) continue;
          newest = Math.min(newest, Math.abs(inputMs - ms) / 86400000);
        }
        if (newest !== Infinity) {
          if (newest <= MATCH.RECENCY_FULL_DAYS) {
            recency = CONTEXT.RECENCY_MAX;
          } else if (newest >= MATCH.RECENCY_ZERO_DAYS) {
            recency = 0;
          } else {
            const span = MATCH.RECENCY_ZERO_DAYS - MATCH.RECENCY_FULL_DAYS;
            recency = CONTEXT.RECENCY_MAX *
              (1 - (newest - MATCH.RECENCY_FULL_DAYS) / span);
          }
        }
      }
    }

    const genericPenalty = isGenericMerchant(normalized.merchantKey)
      ? PENALTY.GENERIC_MERCHANT
      : 0;
    const weakFuzzyPenalty = identity.kind === "SIMILARITY" &&
        identity.similarity < MATCH.WEAK_FUZZY_BELOW &&
        support === 1
      ? PENALTY.WEAK_FUZZY
      : 0;

    const total = identity.identity + history + supportBonus +
      source + direction + currency + amount + recency + genericPenalty +
      weakFuzzyPenalty;

    const reasons: ReasonCode[] = [identity.kind];
    if (history > 0) reasons.push("HISTORY");
    if (source !== 0) reasons.push("SOURCE");
    if (direction !== 0) reasons.push("DIRECTION");
    if (currency !== 0) reasons.push("CURRENCY");
    if (amount > 0) reasons.push("AMOUNT");
    if (recency > 0) reasons.push("RECENCY");
    if (genericPenalty < 0) reasons.push("GENERIC");
    if (weakFuzzyPenalty < 0) reasons.push("WEAK_FUZZY");

    scored.push({
      account,
      score: total,
      support,
      reasons,
      split: false,
      breakdown: {
        identity: identity.identity,
        identityKind: identity.kind,
        history,
        supportBonus,
        source,
        direction,
        currency,
        amount,
        recency,
        genericPenalty,
        weakFuzzyPenalty,
        total,
      },
    });
  }

  scored.sort(compareScored);
  if (scored.length >= 2) {
    const top = scored[0];
    const second = scored[1];
    const margin = top.score - second.score;
    if (second.support >= 2 && margin < CONFIDENCE.HIGH_MARGIN) {
      top.split = true;
      top.reasons = [...top.reasons, "SPLIT"];
    }
  }
  return scored;
}

export function toCandidates(
  scored: ScoredAccount[],
  limit = 3,
): AccountCandidate[] {
  return scored.slice(0, limit).map((item) => ({
    account: item.account,
    score: item.score,
    support: item.support,
    reasons: item.reasons,
  }));
}

function compareScored(a: ScoredAccount, b: ScoredAccount): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.support !== a.support) return b.support - a.support;
  return a.account.localeCompare(b.account);
}

export function debugBreakdown(
  account: string,
  breakdown: ScoreBreakdown,
  margin: number,
): string {
  return [
    `account=${account}`,
    `identity=${round(breakdown.identity)}(${breakdown.identityKind || "-"})`,
    `history=${round(breakdown.history)}`,
    `support=${round(breakdown.supportBonus)}`,
    `source=${round(breakdown.source)}`,
    `direction=${round(breakdown.direction)}`,
    `currency=${round(breakdown.currency)}`,
    `amount=${round(breakdown.amount)}`,
    `recency=${round(breakdown.recency)}`,
    `generic=${round(breakdown.genericPenalty)}`,
    `fuzzy=${round(breakdown.weakFuzzyPenalty)}`,
    `total=${round(breakdown.total)}`,
    `margin=${round(margin)}`,
  ].join(" ");
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}
