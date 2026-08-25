export type Confidence =
  | "HIGH"
  | "MEDIUM"
  | "NEEDS_REVIEW"
  | "UNKNOWN";

export type AccountSource =
  | "USER"
  | "RULE"
  | "HISTORY"
  | "TFIDF"
  | "UNKNOWN";

export type AmountDirection = "DEBIT" | "CREDIT";

export type ReasonCode =
  | "USER"
  | "RULE"
  | "EXACT_MERCHANT"
  | "ALIAS"
  | "EXACT_DESCRIPTION"
  | "SIMILARITY"
  | "HISTORY"
  | "SOURCE"
  | "DIRECTION"
  | "CURRENCY"
  | "AMOUNT"
  | "RECENCY"
  | "GENERIC"
  | "WEAK_FUZZY"
  | "SPLIT"
  | "TRANSFER"
  | "PREFIX"
  | "TFIDF"
  | "UNKNOWN";

export interface MerchantRule {
  merchant: string;
  account: string;
}

export interface HistoryPosting {
  transactionId: string;
  date: string;
  payee: string;
  sourceAccount?: string;
  categoryAccount: string;
  amount: number;
  absoluteAmount: number;
  direction?: AmountDirection;
  commodity: string;
}

export interface PredictionInput {
  description: string;
  amount?: number;
  date?: string;
  commodity?: string;
  sourceAccount?: string;
  direction?: AmountDirection;
  prefix: string;
  rowIndex?: number;
  helperInvocationIndex?: number;
}

export interface CurrentImportRow {
  rowIndex?: number;
  helperInvocationIndex?: number;
  description: string;
  amount?: number;
  date?: string;
  commodity?: string;
  sourceAccount?: string;
  prefix: string;
}

export interface CurrentImportContext {
  rows: CurrentImportRow[];
}

export interface PredictionOptions {
  merchantRules?: MerchantRule[];
}

export interface AccountCandidate {
  account: string;
  score: number;
  support: number;
  reasons: ReasonCode[];
}

export interface ScoreBreakdown {
  identity: number;
  identityKind: ReasonCode | null;
  history: number;
  supportBonus: number;
  source: number;
  direction: number;
  currency: number;
  amount: number;
  recency: number;
  genericPenalty: number;
  weakFuzzyPenalty: number;
  total: number;
}

export interface PredictionResult {
  account: string;
  confidence: Confidence;
  score: number;
  support: number;
  margin: number;
  reasons: ReasonCode[];
  alternatives: AccountCandidate[];
  possibleTransfer: boolean;
  merchantKey: string;
  source: AccountSource;
  breakdown: ScoreBreakdown;
  debug: string;
  prefix: string;
  rowIndex?: number;
  helperInvocationIndex: number;
}

export interface NormalizedDescription {
  raw: string;
  full: string;
  noiseStripped: string;
  tokens: string[];
  merchantKey: string;
}

export interface IndexedPosting {
  payee: string;
  normalized: NormalizedDescription;
  account: string;
  sourceAccount?: string;
  amount: number;
  absoluteAmount: number;
  direction?: AmountDirection;
  date: string;
  commodity: string;
  transactionId: string;
}

export interface PredictionIndex {
  postings: IndexedPosting[];
  byMerchant: Map<string, IndexedPosting[]>;
  byNormalized: Map<string, IndexedPosting[]>;
  accounts: string[];
}

export interface UserOverride {
  account: string;
  source: "USER";
}
