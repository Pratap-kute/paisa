import { adaptPredictAccountArgs } from "./adapter";
import { buildIndex } from "./index";
import { normalizeDescription } from "./normalize";
import { predict, unknownResult } from "./predict";
import { tfidfFallback } from "./tfidf";
import { detectTransfer } from "./transfer";
import { accountMatchesPrefix, normalizePrefix, unknownAccount } from "./score";
import type {
  Confidence,
  CurrentImportContext,
  HistoryPosting,
  MerchantRule,
  PredictionIndex,
  PredictionInput,
  PredictionOptions,
  PredictionResult,
  UserOverride,
} from "./types";

export type ConfidenceFilter =
  | "HIGH"
  | "MEDIUM"
  | "NEEDS_REVIEW"
  | "UNKNOWN"
  | "TRANSFER"
  | null;

export interface PredictionFilterCounts {
  all: number;
  high: number;
  medium: number;
  needsReview: number;
  unknown: number;
  transfer: number;
}

function predictionKey(
  rowIndex: number | undefined,
  helperInvocationIndex: number,
  prefix: string,
): string {
  return `${rowIndex ?? "na"}\t${helperInvocationIndex}\t${
    normalizePrefix(prefix)
  }`;
}

function merchantOverrideKey(merchantKey: string, prefix: string): string {
  return `${merchantKey}::${normalizePrefix(prefix)}`;
}

function merchantRulesFromConfig(): PredictionOptions["merchantRules"] {
  try {
    const config = (globalThis as {
      USER_CONFIG?: {
        prediction?: {
          merchant_rules?: MerchantRule[];
        };
      };
    }).USER_CONFIG;
    return config?.prediction?.merchant_rules || [];
  } catch (_error) {
    return [];
  }
}

export class PredictionSession {
  index: PredictionIndex | null = null;
  currentImport: CurrentImportContext = { rows: [] };
  buildCount = 0;
  results = new Map<string, PredictionResult>();
  overrides = new Map<string, UserOverride>();
  merchantOverrides = new Map<string, string>();
  private fingerprint = "";
  private inputs = new Map<string, PredictionInput>();
  private lastRowIndex: number | undefined = undefined;
  private nextInvocation = 0;

  reset() {
    this.index = null;
    this.currentImport = { rows: [] };
    this.buildCount = 0;
    this.results = new Map();
    this.overrides = new Map();
    this.merchantOverrides = new Map();
    this.fingerprint = "";
    this.inputs = new Map();
    this.lastRowIndex = undefined;
    this.nextInvocation = 0;
  }

  beginRender() {
    this.currentImport = { rows: [] };
    this.results = new Map();
    this.inputs = new Map();
    this.lastRowIndex = undefined;
    this.nextInvocation = 0;
  }

  clearPreview() {
    this.results = new Map();
    this.overrides = new Map();
    this.merchantOverrides = new Map();
    this.currentImport = { rows: [] };
    this.inputs = new Map();
    this.lastRowIndex = undefined;
    this.nextInvocation = 0;
  }

  loadHistory(history: HistoryPosting[]) {
    const next = JSON.stringify(history);
    if (this.index && this.fingerprint === next) {
      return this.index;
    }
    this.index = buildIndex(history);
    this.fingerprint = next;
    this.buildCount += 1;
    this.results = new Map();
    return this.index;
  }

  predictFromHelper(
    args: unknown[],
    options: {
      hash?: Record<string, unknown>;
      data?: { root?: { ROW?: Record<string, unknown> } };
    },
  ): PredictionResult {
    const input = adaptPredictAccountArgs(args, options);
    const rowIndex = input.rowIndex;
    if (rowIndex !== this.lastRowIndex) {
      this.lastRowIndex = rowIndex;
      this.nextInvocation = 0;
    }
    input.helperInvocationIndex = this.nextInvocation++;
    return this.predictInput(input);
  }

  predictInput(input: PredictionInput): PredictionResult {
    const helperInvocationIndex = input.helperInvocationIndex ?? 0;
    const keyed: PredictionInput = { ...input, helperInvocationIndex };
    const key = predictionKey(
      keyed.rowIndex,
      helperInvocationIndex,
      keyed.prefix,
    );
    this.currentImport.rows.push({
      rowIndex: keyed.rowIndex,
      helperInvocationIndex,
      description: keyed.description,
      amount: keyed.amount,
      date: keyed.date,
      commodity: keyed.commodity,
      sourceAccount: keyed.sourceAccount,
      prefix: keyed.prefix,
    });
    this.inputs.set(key, keyed);

    const normalized = normalizeDescription(keyed.description);
    const rowOverride = this.overrides.get(key);
    if (rowOverride) {
      const result = userResult(
        keyed,
        rowOverride.account,
        normalized.merchantKey,
      );
      this.results.set(key, result);
      return result;
    }

    const merchantKey = merchantOverrideKey(
      normalized.merchantKey,
      keyed.prefix,
    );
    const merchantAccount = this.merchantOverrides.get(merchantKey);
    if (
      merchantAccount && accountMatchesPrefix(merchantAccount, keyed.prefix)
    ) {
      const result = userResult(keyed, merchantAccount, normalized.merchantKey);
      this.results.set(key, result);
      return result;
    }

    const index = this.index || buildIndex([]);
    const options: PredictionOptions = {
      merchantRules: merchantRulesFromConfig(),
    };
    let result = predict(keyed, options, index, this.currentImport);
    if (
      result.confidence === "UNKNOWN" ||
      result.source === "UNKNOWN"
    ) {
      const fallback = tfidfFallback(keyed);
      if (fallback && fallback.confidence !== "UNKNOWN") {
        fallback.possibleTransfer = result.possibleTransfer;
        fallback.confidence = "NEEDS_REVIEW";
        if (result.possibleTransfer) {
          fallback.reasons = [...fallback.reasons, "TRANSFER"];
        }
        result = fallback;
      }
    }
    this.results.set(key, result);
    return result;
  }

  finalizeCurrentImport() {
    for (const [key, result] of this.results) {
      const input = this.inputs.get(key);
      if (!input) continue;
      const possibleTransfer = detectTransfer(input, this.currentImport);
      result.possibleTransfer = possibleTransfer;
      if (possibleTransfer && !result.reasons.includes("TRANSFER")) {
        result.reasons = [...result.reasons, "TRANSFER"];
      }
      if (
        possibleTransfer &&
        (result.confidence === "HIGH" || result.confidence === "MEDIUM")
      ) {
        result.confidence = "NEEDS_REVIEW";
      }
    }
  }

  setOverride(
    rowIndex: number,
    prefix: string,
    account: string,
    helperInvocationIndex = 0,
  ) {
    this.overrides.set(
      predictionKey(rowIndex, helperInvocationIndex, prefix),
      { account, source: "USER" },
    );
  }

  applyToSimilar(
    rowIndex: number,
    prefix: string,
    account: string,
    helperInvocationIndex = 0,
  ) {
    const current = this.results.get(
      predictionKey(rowIndex, helperInvocationIndex, prefix),
    );
    const merchantKey = current?.merchantKey || "";
    this.setOverride(rowIndex, prefix, account, helperInvocationIndex);
    if (!merchantKey) return;
    const normalized = normalizePrefix(prefix);
    for (const [key, result] of this.results) {
      if (normalizePrefix(result.prefix) !== normalized) continue;
      if (result.merchantKey !== merchantKey) continue;
      if (
        this.overrides.has(key) &&
        result.rowIndex !== rowIndex
      ) {
        continue;
      }
      this.overrides.set(key, { account, source: "USER" });
    }
  }

  alwaysUseMerchant(merchantKey: string, prefix: string, account: string) {
    if (!merchantKey) return;
    if (!accountMatchesPrefix(account, prefix)) return;
    this.merchantOverrides.set(
      merchantOverrideKey(merchantKey, prefix),
      account,
    );
  }

  counts(): Record<
    "high" | "medium" | "review" | "unknown" | "transfer",
    number
  > {
    const rows = this.rowSummaries();
    const counts = { high: 0, medium: 0, review: 0, unknown: 0, transfer: 0 };
    for (const row of rows) {
      if (row.possibleTransfer) counts.transfer += 1;
      if (row.confidence === "HIGH") counts.high += 1;
      else if (row.confidence === "MEDIUM") counts.medium += 1;
      else if (row.confidence === "NEEDS_REVIEW") counts.review += 1;
      else counts.unknown += 1;
    }
    return counts;
  }

  rowSummaries(): Array<{
    rowIndex: number;
    confidence: Confidence;
    possibleTransfer: boolean;
    results: PredictionResult[];
  }> {
    const byRow = new Map<number, PredictionResult[]>();
    for (const result of this.results.values()) {
      const rowIndex = result.rowIndex;
      if (rowIndex == null || Number.isNaN(rowIndex)) continue;
      const list = byRow.get(rowIndex) || [];
      list.push(result);
      byRow.set(rowIndex, list);
    }
    return [...byRow.entries()].map(([rowIndex, results]) => ({
      rowIndex,
      confidence: worstConfidence(results.map((item) => item.confidence)),
      possibleTransfer: results.some((item) => item.possibleTransfer),
      results,
    }));
  }

  resultsForRow(rowIndex: number): PredictionResult[] {
    return [...this.results.values()].filter((result) =>
      result.rowIndex === rowIndex
    );
  }

  unknownAccountFor(prefix: string): string {
    return unknownAccount(prefix);
  }
}

function worstConfidence(values: Confidence[]): Confidence {
  const rank: Record<Confidence, number> = {
    HIGH: 0,
    MEDIUM: 1,
    NEEDS_REVIEW: 2,
    UNKNOWN: 3,
  };
  return values.reduce(
    (worst, value) => rank[value] > rank[worst] ? value : worst,
    "HIGH",
  );
}

function userResult(
  input: PredictionInput,
  account: string,
  merchantKey: string,
): PredictionResult {
  const base = unknownResult(input);
  return {
    ...base,
    account,
    confidence: "HIGH",
    score: 1000,
    support: 1,
    margin: 1000,
    reasons: ["USER"],
    merchantKey,
    source: "USER",
    possibleTransfer: false,
    debug: `account=${account} source=USER`,
    prefix: input.prefix,
    rowIndex: input.rowIndex,
    helperInvocationIndex: input.helperInvocationIndex ?? 0,
  };
}

export const predictionSession = new PredictionSession();

export function rowMatchesFilter(
  summary: { confidence: Confidence; possibleTransfer: boolean } | undefined,
  filter: ConfidenceFilter,
): boolean {
  if (!filter) return true;
  if (!summary) return filter === "UNKNOWN";
  if (filter === "TRANSFER") return summary.possibleTransfer;
  return summary.confidence === filter;
}
