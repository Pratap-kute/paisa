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
  PredictionReviewProgress,
  PredictionReviewState,
  PredictionReviewStatus,
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

export function computeInputFingerprint(
  input: PredictionInput,
  merchantKey?: string,
): string {
  const normMerchant = merchantKey ||
    normalizeDescription(input.description || "").merchantKey;
  const amountStr = input.amount != null ? String(input.amount) : "";
  const commodityStr = input.commodity || "";
  const src = input.sourceAccount || "";
  const prefix = normalizePrefix(input.prefix || "");
  return `${normMerchant}|${amountStr}|${commodityStr}|${src}|${prefix}`;
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
  reviewStates = new Map<string, PredictionReviewState>();
  private fingerprint = "";
  private inputs = new Map<string, PredictionInput>();
  private lastRowIndex: number | undefined = undefined;
  private nextInvocation = 0;
  private visitedKeysInRender = new Set<string>();

  reset() {
    this.index = null;
    this.currentImport = { rows: [] };
    this.buildCount = 0;
    this.results = new Map();
    this.overrides = new Map();
    this.merchantOverrides = new Map();
    this.reviewStates = new Map();
    this.fingerprint = "";
    this.inputs = new Map();
    this.lastRowIndex = undefined;
    this.nextInvocation = 0;
    this.visitedKeysInRender = new Set();
  }

  beginRender() {
    this.currentImport = { rows: [] };
    this.results = new Map();
    this.inputs = new Map();
    this.lastRowIndex = undefined;
    this.nextInvocation = 0;
    this.visitedKeysInRender = new Set();
  }

  clearPreview() {
    this.results = new Map();
    this.overrides = new Map();
    this.merchantOverrides = new Map();
    this.reviewStates = new Map();
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
    this.visitedKeysInRender.add(key);

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
    const fingerprint = computeInputFingerprint(keyed, normalized.merchantKey);

    // If template edit materially changed the input for this key, reset review state & override
    const existingReview = this.reviewStates.get(key);
    if (existingReview && existingReview.inputFingerprint !== fingerprint) {
      this.reviewStates.delete(key);
      this.overrides.delete(key);
    }

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

    if (!this.reviewStates.has(key)) {
      const reviewRequired = this.requiresReview(result);
      this.reviewStates.set(key, {
        status: "UNREVIEWED",
        initialAccount: result.account,
        currentAccount: result.account,
        initialConfidence: result.confidence,
        wasReviewRequired: reviewRequired,
        inputFingerprint: fingerprint,
      });
    }

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

      const reviewState = this.reviewStates.get(key);
      if (reviewState && reviewState.status === "UNREVIEWED") {
        reviewState.initialConfidence = result.confidence;
        if (this.requiresReview(result)) {
          reviewState.wasReviewRequired = true;
        }
      }
    }

    // Prune stale reviewStates and overrides for keys not present in this render pass
    if (this.visitedKeysInRender.size > 0) {
      for (const key of [...this.reviewStates.keys()]) {
        if (!this.visitedKeysInRender.has(key)) {
          this.reviewStates.delete(key);
          this.overrides.delete(key);
        }
      }
    }
  }

  setOverride(
    rowIndex: number,
    prefix: string,
    account: string,
    helperInvocationIndex = 0,
  ) {
    const key = predictionKey(rowIndex, helperInvocationIndex, prefix);
    this.overrides.set(
      key,
      { account, source: "USER" },
    );
    const existing = this.reviewStates.get(key);
    const input = this.inputs.get(key);
    const fingerprint = input
      ? computeInputFingerprint(
        input,
        normalizeDescription(input.description || "").merchantKey,
      )
      : existing?.inputFingerprint || "";

    this.reviewStates.set(key, {
      status: "CORRECTED",
      initialAccount: existing?.initialAccount || account,
      currentAccount: account,
      initialConfidence: existing?.initialConfidence || "UNKNOWN",
      wasReviewRequired: existing ? existing.wasReviewRequired : true,
      inputFingerprint: fingerprint,
      reviewedAt: Date.now(),
    });
  }

  confirmPrediction(
    rowIndex: number,
    prefix: string,
    account?: string,
    helperInvocationIndex = 0,
  ): { status: PredictionReviewStatus; account: string } {
    const key = predictionKey(rowIndex, helperInvocationIndex, prefix);
    const current = this.results.get(key);
    const targetAccount = account || current?.account || unknownAccount(prefix);
    const existing = this.reviewStates.get(key);
    const isCorrected = Boolean(
      existing
        ? targetAccount !== existing.initialAccount
        : current && account && account !== current.account,
    );
    const status: PredictionReviewStatus = isCorrected
      ? "CORRECTED"
      : "ACCEPTED";

    const input = this.inputs.get(key);
    const fingerprint = input
      ? computeInputFingerprint(
        input,
        normalizeDescription(input.description || "").merchantKey,
      )
      : existing?.inputFingerprint || "";

    if (isCorrected) {
      this.overrides.set(key, { account: targetAccount, source: "USER" });
    }

    this.reviewStates.set(key, {
      status,
      initialAccount: existing?.initialAccount || current?.account ||
        targetAccount,
      currentAccount: targetAccount,
      initialConfidence: existing?.initialConfidence || current?.confidence ||
        "UNKNOWN",
      wasReviewRequired: existing
        ? existing.wasReviewRequired
        : (current ? this.requiresReview(current) : true),
      inputFingerprint: fingerprint,
      reviewedAt: Date.now(),
    });

    return { status, account: targetAccount };
  }

  applyToSimilar(
    rowIndex: number,
    prefix: string,
    account: string,
    helperInvocationIndex = 0,
  ): { appliedCount: number } {
    const targetKey = predictionKey(rowIndex, helperInvocationIndex, prefix);
    const current = this.results.get(targetKey);
    const merchantKey = current?.merchantKey || "";

    this.confirmPrediction(rowIndex, prefix, account, helperInvocationIndex);
    const affectedRowIndices = new Set<number>();
    if (rowIndex != null) {
      affectedRowIndices.add(rowIndex);
    }

    if (merchantKey) {
      const normalized = normalizePrefix(prefix);
      const now = Date.now();
      for (const [key, result] of this.results) {
        if (key === targetKey) continue;
        if (normalizePrefix(result.prefix) !== normalized) continue;
        if (result.merchantKey !== merchantKey) continue;
        if (this.overrides.has(key)) continue;

        this.overrides.set(key, { account, source: "USER" });

        const existing = this.reviewStates.get(key);
        const input = this.inputs.get(key);
        const fingerprint = input
          ? computeInputFingerprint(input, merchantKey)
          : existing?.inputFingerprint || "";

        this.reviewStates.set(key, {
          status: "CORRECTED",
          initialAccount: existing?.initialAccount || result.account,
          currentAccount: account,
          initialConfidence: existing?.initialConfidence || result.confidence,
          wasReviewRequired: existing
            ? existing.wasReviewRequired
            : this.requiresReview(result),
          inputFingerprint: fingerprint,
          reviewedAt: now,
        });

        if (result.rowIndex != null) {
          affectedRowIndices.add(result.rowIndex);
        }
      }
    }

    return { appliedCount: affectedRowIndices.size };
  }

  similarPredictionsCount(
    rowIndex: number,
    prefix: string,
    helperInvocationIndex = 0,
  ): number {
    const targetKey = predictionKey(rowIndex, helperInvocationIndex, prefix);
    const current = this.results.get(targetKey);
    const merchantKey = current?.merchantKey || "";
    if (!merchantKey) return 0;

    const normalized = normalizePrefix(prefix);
    const matchedRowIndices = new Set<number>();
    for (const result of this.results.values()) {
      if (result.rowIndex == null || result.rowIndex === rowIndex) continue;
      if (normalizePrefix(result.prefix) !== normalized) continue;
      if (result.merchantKey !== merchantKey) continue;
      matchedRowIndices.add(result.rowIndex);
    }
    return matchedRowIndices.size;
  }

  alwaysUseMerchant(merchantKey: string, prefix: string, account: string) {
    if (!merchantKey) return;
    if (!accountMatchesPrefix(account, prefix)) return;
    this.merchantOverrides.set(
      merchantOverrideKey(merchantKey, prefix),
      account,
    );
  }

  requiresReview(result: PredictionResult): boolean {
    return (
      result.confidence === "NEEDS_REVIEW" ||
      result.confidence === "UNKNOWN" ||
      result.possibleTransfer === true
    );
  }

  isPredictionResolved(result: PredictionResult): boolean {
    const key = predictionKey(
      result.rowIndex,
      result.helperInvocationIndex,
      result.prefix,
    );
    const reviewState = this.reviewStates.get(key);
    if (reviewState) {
      if (!reviewState.wasReviewRequired) return true;
      return reviewState.status === "ACCEPTED" ||
        reviewState.status === "CORRECTED";
    }
    return !this.requiresReview(result);
  }

  isRowResolved(rowIndex: number): boolean {
    const rowResults = this.resultsForRow(rowIndex);
    if (rowResults.length === 0) return true;
    return rowResults.every((r) => this.isPredictionResolved(r));
  }

  getReviewState(
    rowIndex?: number,
    helperInvocationIndex = 0,
    prefix = "",
  ): PredictionReviewState | undefined {
    return this.reviewStates.get(
      predictionKey(rowIndex, helperInvocationIndex, prefix),
    );
  }

  getInput(
    rowIndex?: number,
    helperInvocationIndex = 0,
    prefix = "",
  ): PredictionInput | undefined {
    return this.inputs.get(
      predictionKey(rowIndex, helperInvocationIndex, prefix),
    );
  }

  unresolvedPredictions(): PredictionResult[] {
    const unresolved: PredictionResult[] = [];
    for (const [key, result] of this.results) {
      const reviewState = this.reviewStates.get(key);
      const needed = reviewState
        ? reviewState.wasReviewRequired
        : this.requiresReview(result);
      if (!needed) continue;

      const resolved = reviewState
        ? (reviewState.status === "ACCEPTED" ||
          reviewState.status === "CORRECTED")
        : false;
      if (!resolved) {
        unresolved.push(result);
      }
    }

    const priority = (r: PredictionResult): number => {
      if (r.confidence === "UNKNOWN") return 1;
      if (r.possibleTransfer) return 2;
      return 3;
    };

    return unresolved.sort((a, b) => {
      const prioA = priority(a);
      const prioB = priority(b);
      if (prioA !== prioB) return prioA - prioB;
      const rowA = a.rowIndex ?? 0;
      const rowB = b.rowIndex ?? 0;
      if (rowA !== rowB) return rowA - rowB;
      return a.helperInvocationIndex - b.helperInvocationIndex;
    });
  }

  unresolvedRows(): number[] {
    const unresolved = this.unresolvedPredictions();
    const seen = new Set<number>();
    const rows: number[] = [];
    for (const item of unresolved) {
      if (item.rowIndex != null && !seen.has(item.rowIndex)) {
        seen.add(item.rowIndex);
        rows.push(item.rowIndex);
      }
    }
    return rows;
  }

  reviewProgress(): PredictionReviewProgress {
    const allRowIndices = new Set<number>();
    const reviewRequiredRowIndices = new Set<number>();

    for (const [key, result] of this.results) {
      if (result.rowIndex != null) {
        allRowIndices.add(result.rowIndex);
        const reviewState = this.reviewStates.get(key);
        const wasRequired = reviewState
          ? reviewState.wasReviewRequired
          : this.requiresReview(result);
        if (wasRequired) {
          reviewRequiredRowIndices.add(result.rowIndex);
        }
      }
    }

    let reviewedCount = 0;
    for (const rowIndex of reviewRequiredRowIndices) {
      if (this.isRowResolved(rowIndex)) {
        reviewedCount += 1;
      }
    }

    const reviewRequiredRows = reviewRequiredRowIndices.size;
    const reviewedRows = reviewedCount;
    const unresolvedRows = Math.max(0, reviewRequiredRows - reviewedRows);
    const percent = reviewRequiredRows === 0
      ? 100
      : Math.round((reviewedRows / reviewRequiredRows) * 100);

    return {
      totalRows: allRowIndices.size,
      reviewRequiredRows,
      reviewedRows,
      unresolvedRows,
      percent,
      total: reviewRequiredRows,
      reviewed: reviewedRows,
      remaining: unresolvedRows,
    };
  }

  nextUnresolved(
    currentRowIndex?: number,
    currentHelperInvocationIndex = 0,
    currentPrefix?: string,
  ): PredictionResult | null {
    const queue = this.unresolvedPredictions();
    if (queue.length === 0) return null;

    if (currentRowIndex == null) {
      return queue[0];
    }

    const currentIdx = queue.findIndex(
      (r) =>
        r.rowIndex === currentRowIndex &&
        r.helperInvocationIndex === currentHelperInvocationIndex &&
        (currentPrefix == null || r.prefix === currentPrefix),
    );

    if (currentIdx === -1) {
      return queue[0];
    }

    return queue[currentIdx + 1] || queue[0];
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
    resolved: boolean;
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
      resolved: results.every((r) => this.isPredictionResolved(r)),
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
