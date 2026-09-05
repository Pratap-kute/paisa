import dayjs, { type Dayjs } from "dayjs";
import BigNumber from "bignumber.js";
import { parse } from "@datasert/cronjs-parser";
import { getFutureMatches } from "@datasert/cronjs-matcher";
import type { Transaction } from "./ledger";
import type { TransactionSequence } from "./recurring";
import { isGenericMerchant, normalizeDescription } from "./merchant";
import { prefixMinutesSeconds } from "./time";

// Product policy, not a user setting. Known currency floors avoid treating
// nominal units as equivalent. Other commodities use precision-aware noise floors.
export const recurringPolicy = {
  minimumOccurrences: 3,
  highOccurrences: 4,
  calendarToleranceDays: 3,
  weeklyToleranceDays: 1,
  customMinimumOccurrences: 4,
  minimumChangeAmounts: { INR: 10, USD: 1, EUR: 1, GBP: 1, JPY: 100 } as Record<
    string,
    number
  >,
  defaultMinorUnits: 100,
  minimumChangeRatio: 0.1,
  stableAmountRatio: 0.05,
  stoppedCycles: 2,
  newDays: 30,
  maximumSchedules: 1000,
} as const;

export type Cadence =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "half-yearly"
  | "yearly"
  | "custom";
export type RecurringKind = "expense" | "income" | "transfer" | "investment";
export interface Rhythm {
  cadence: Cadence;
  reliable: boolean;
  days: number;
  months: number;
  anchorDay: number;
  monthEnd: boolean;
  tolerance: number;
}
export interface Occurrence {
  transaction: Transaction;
  amount: number;
  expenseAmount: number;
  cashOutflowAmount?: number;
  cashCommodity?: string;
  cashObligation: boolean;
  commodity: string;
  kind: RecurringKind;
  context: string;
  merchantKey: string;
}
export interface RecurringAnalysis {
  key: string;
  displayName: string;
  confirmed: boolean;
  occurrences: Occurrence[];
  rhythm: Rhythm;
  scheduleSource: "inferred" | "explicit-period";
  effectiveCadence: string;
  expectedExpenseAmount?: number;
  expectedCashOutflowAmount?: number;
  cashCommodity?: string;
  cashObligation: boolean;
  reliability: "high" | "medium" | "low";
  kind?: RecurringKind;
  commodity?: string;
  latestAmount?: number;
  previousAmount?: number;
  typicalAmount?: number;
  expectedAmount?: number;
  annualFrequency?: number;
  approximate: boolean;
  lastDate: Dayjs;
  expectedDate?: Dayjs;
  windowStart?: Dayjs;
  windowEnd?: Dayjs;
  upcomingDates: Dayjs[];
  amountChange?: {
    previous: number;
    latest: number;
    difference: number;
    percentage?: number;
  };
  lifecycle: "active" | "new" | "possibly-stopped";
  flags: {
    amountChanged: boolean;
    expectedSoon: boolean;
    laterThanUsual: boolean;
    cadenceChanged: boolean;
  };
  reasons: string[];
  transactions: Transaction[];
  scheduleError?: string;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length === 0
    ? 0
    : sorted.length % 2
    ? sorted[middle]
    : new BigNumber(sorted[middle - 1]).plus(sorted[middle]).div(2).toNumber();
}

export function inferCadence(dates: Dayjs[]): Rhythm {
  const sorted = [...dates].sort((a, b) => a.valueOf() - b.valueOf());
  const intervals = sorted.slice(1).map((date, i) =>
    date.startOf("day").diff(sorted[i].startOf("day"), "day")
  );
  const anchorDay = Math.round(median(sorted.map((d) => d.date())));
  const monthEnd = sorted.length > 1 &&
    sorted.every((d) =>
      d.daysInMonth() - d.date() <= recurringPolicy.calendarToleranceDays
    );
  const base: Rhythm = {
    cadence: "custom",
    reliable: false,
    days: Math.round(median(intervals)),
    months: 0,
    anchorDay,
    monthEnd,
    tolerance: recurringPolicy.calendarToleranceDays,
  };
  if (!intervals.length || intervals.some((n) => n <= 0)) return base;
  for (
    const [cadence, months] of [["monthly", 1], ["quarterly", 3], [
      "half-yearly",
      6,
    ], ["yearly", 12]] as const
  ) {
    const fits = sorted.every((d, i) => {
      const target = sorted[0].startOf("month").add(i * months, "month");
      const scheduled = target.date(
        monthEnd
          ? target.daysInMonth()
          : Math.min(anchorDay, target.daysInMonth()),
      );
      return Math.abs(d.startOf("day").diff(scheduled, "day")) <=
        recurringPolicy.calendarToleranceDays;
    });
    if (fits) return { ...base, cadence, months, reliable: true };
  }
  for (const [cadence, days] of [["weekly", 7], ["biweekly", 14]] as const) {
    if (
      intervals.every((n) =>
        Math.abs(n - days) <= recurringPolicy.weeklyToleranceDays
      )
    ) {
      return {
        ...base,
        cadence,
        days,
        reliable: true,
        tolerance: recurringPolicy.weeklyToleranceDays,
      };
    }
  }
  // Only regular custom intervals receive predictions; irregular manual tags remain visible.
  return {
    ...base,
    reliable: sorted.length >= recurringPolicy.customMinimumOccurrences &&
      base.days > 3 &&
      intervals.every((n) =>
        Math.abs(n - base.days) <= Math.min(3, base.days * 0.1)
      ),
  };
}

export function advanceOccurrence(
  date: Dayjs,
  rhythm: Rhythm,
  cycles = 1,
): Dayjs {
  if (!rhythm.months) return date.add(rhythm.days * cycles, "day");
  const target = date.startOf("month").add(rhythm.months * cycles, "month");
  return target.date(
    rhythm.monthEnd
      ? target.daysInMonth()
      : Math.min(rhythm.anchorDay, target.daysInMonth()),
  );
}

export function economicOccurrence(
  transaction: Transaction,
): Occurrence | undefined {
  if (!transaction.date?.isValid() || !transaction.postings.length) {
    return undefined;
  }
  const expenses = transaction.postings.filter((p) =>
    p.account.startsWith("Expenses:")
  );
  const income = transaction.postings.filter((p) =>
    p.account.startsWith("Income:")
  );
  // Mixed income/expense transactions cannot safely be treated as a single commitment.
  if (expenses.length && income.length) return undefined;
  const selected = expenses.length
    ? expenses
    : income.length
    ? income
    : transaction.postings.filter((p) => p.quantity > 0);
  if (!selected.length || selected.some((p) => !Number.isFinite(p.quantity))) {
    return undefined;
  }
  const commodities = new Set(selected.map((p) => p.commodity));
  if (commodities.size !== 1) return undefined;
  const amount = selected.reduce(
    (sum, p) => sum.plus(p.quantity),
    new BigNumber(0),
  );
  if (!Number.isFinite(amount.toNumber())) return undefined;
  // Refunds/reversals must not inflate outgoing expense commitments.
  if (
    (expenses.length && !amount.isPositive()) ||
    (income.length && !amount.isNegative())
  ) return undefined;
  const kind: RecurringKind = expenses.length
    ? "expense"
    : income.length
    ? "income"
    : selected.some((p) =>
        /(?:^|:)(?:Investments?|Broker(?:age)?|Equity|MutualFunds?|SIP)(?:$|:)/i
          .test(p.account)
      )
    ? "investment"
    : "transfer";
  const cashPostings = transaction.postings.filter((p) =>
    p.account.startsWith("Assets:") && p.quantity < 0
  );
  const cashCommodities = new Set(cashPostings.map((p) => p.commodity));
  const cashComparable = cashPostings.length > 0 &&
    cashCommodities.size === 1 &&
    cashPostings.every((p) => Number.isFinite(p.quantity));
  const cashOutflowAmount = cashComparable
    ? cashPostings.reduce((sum, p) => sum.minus(p.quantity), new BigNumber(0))
      .toNumber()
    : undefined;
  const cashObligation = expenses.length > 0 ||
    transaction.postings.some((p) =>
      p.account.startsWith("Liabilities:") && p.quantity > 0
    );
  const context = [
    ...new Set(
      transaction.postings.map((p) =>
        `${p.account}:${Math.sign(p.quantity)}:${p.commodity}`
      ),
    ),
  ].sort().join("|");
  return {
    transaction,
    amount: amount.abs().toNumber(),
    expenseAmount: expenses.length ? amount.toNumber() : 0,
    cashOutflowAmount: Number.isFinite(cashOutflowAmount)
      ? cashOutflowAmount
      : undefined,
    cashCommodity: cashComparable ? cashPostings[0].commodity : undefined,
    cashObligation,
    commodity: selected[0].commodity,
    kind,
    context,
    merchantKey: normalizeDescription(transaction.payee).merchantKey,
  };
}

function validTransactions(
  transactions: Transaction[],
  asOf: Dayjs,
): Transaction[] {
  return [
    ...new Map(
      transactions.filter((t) =>
        t.date?.isValid() && !t.date.isAfter(asOf, "day")
      ).map((t) => [t.id, t]),
    ).values(),
  ].sort((a, b) =>
    a.date.valueOf() - b.date.valueOf() || a.id.localeCompare(b.id)
  );
}

export function analyzeRecurring(
  key: string,
  input: Transaction[],
  confirmed: boolean,
  asOf: Dayjs,
  period = "",
): RecurringAnalysis | undefined {
  const transactions = validTransactions(input, asOf);
  if (!transactions.length) return undefined;
  const occurrences = transactions.map(economicOccurrence).filter((
    o,
  ): o is Occurrence => !!o);
  const rhythm = inferCadence(transactions.map((t) => t.date));
  const last = transactions[transactions.length - 1];
  const comparable = occurrences.length === transactions.length &&
    new Set(occurrences.map((o) => `${o.kind}:${o.commodity}`)).size === 1;
  const amounts = comparable ? occurrences.map((o) => o.amount) : [];
  const {
    latestAmount,
    previousAmount,
    typicalAmount,
    expectedAmount,
    approximate,
    baselineStable,
    amountChange,
  } = analyzeAmounts(
    amounts,
    comparable ? occurrences[0].commodity : undefined,
  );
  const expectedExpenseAmount = comparable
    ? analyzeAmounts(
      occurrences.map((o) => o.expenseAmount),
      occurrences[0].commodity,
    ).expectedAmount
    : undefined;
  const cashComparable = occurrences.length === transactions.length &&
    occurrences.every((o) => o.cashOutflowAmount !== undefined) &&
    new Set(occurrences.map((o) => o.cashCommodity)).size === 1;
  const expectedCashOutflowAmount = cashComparable
    ? analyzeAmounts(
      occurrences.map((o) => o.cashOutflowAmount!),
      occurrences[0].cashCommodity,
    ).expectedAmount
    : undefined;
  const cashObligation = occurrences.length === transactions.length &&
    occurrences.every((o) => o.cashObligation);
  const { expectedDate, future, scheduleError, annualFrequency } =
    predictRecurringDates(last.date, rhythm, asOf, period);
  const tolerance = period ? 0 : rhythm.tolerance;
  const windowStart = expectedDate?.subtract(tolerance, "day");
  const windowEnd = expectedDate?.add(tolerance, "day");
  const laterThanUsual = !!windowEnd && asOf.isAfter(windowEnd, "day");
  const stopped = future.length >= recurringPolicy.stoppedCycles &&
    asOf.isAfter(
      future[recurringPolicy.stoppedCycles - 1].add(tolerance, "day"),
      "day",
    );
  const newlyEstablished =
    transactions.length === recurringPolicy.minimumOccurrences &&
    asOf.diff(last.date, "day") <= recurringPolicy.newDays;
  const previousRhythm = inferCadence(
    transactions.slice(0, -1).map((t) => t.date),
  );
  return {
    key,
    displayName: confirmed ? key : last.payee,
    confirmed,
    occurrences,
    rhythm,
    scheduleSource: period.trim() ? "explicit-period" : "inferred",
    effectiveCadence: period.trim() ? "Explicit schedule" : rhythm.cadence,
    expectedExpenseAmount,
    expectedCashOutflowAmount,
    cashCommodity: cashComparable ? occurrences[0].cashCommodity : undefined,
    cashObligation,
    reliability: rhythm.reliable
      ? transactions.length >= recurringPolicy.highOccurrences
        ? "high"
        : transactions.length >= recurringPolicy.minimumOccurrences
        ? "medium"
        : "low"
      : "low",
    kind: comparable ? occurrences[0].kind : undefined,
    commodity: comparable ? occurrences[0].commodity : undefined,
    latestAmount,
    previousAmount,
    typicalAmount,
    expectedAmount,
    annualFrequency,
    approximate,
    lastDate: last.date,
    expectedDate,
    windowStart,
    windowEnd,
    upcomingDates: stopped
      ? []
      : future.filter((d) =>
        !d.isBefore(asOf, "day") && !d.isAfter(asOf.add(30, "day"), "day")
      ),
    amountChange,
    lifecycle: stopped
      ? "possibly-stopped"
      : newlyEstablished
      ? "new"
      : "active",
    flags: {
      amountChanged: !!amountChange,
      expectedSoon: !stopped &&
        future.some((d) =>
          !d.isBefore(asOf, "day") && !d.isAfter(asOf.add(7, "day"), "day")
        ),
      laterThanUsual,
      cadenceChanged: !period.trim() && transactions.length >= 4 &&
        previousRhythm.reliable &&
        (!rhythm.reliable || previousRhythm.cadence !== rhythm.cadence),
    },
    reasons: [
      "Same normalized merchant",
      "Consistent account and direction",
      "Regular timing",
      ...(baselineStable ? ["Similar historical amounts"] : []),
    ],
    transactions,
    scheduleError,
  };
}

export function discoverRecurringCandidates(
  transactions: Transaction[],
  confirmed: TransactionSequence[],
  asOf: Dayjs,
): RecurringAnalysis[] {
  const taggedIDs = new Set(
    confirmed.flatMap((s) => s.transactions.map((t) => t.id)),
  );
  const groups = new Map<string, Transaction[]>();
  for (const t of validTransactions(transactions, asOf)) {
    if (
      taggedIDs.has(t.id) || t.tag_recurring ||
      t.postings.some((p) => p.tag_recurring)
    ) continue;
    const o = economicOccurrence(t);
    if (!o || isGenericMerchant(o.merchantKey)) continue;
    const key = JSON.stringify([o.merchantKey, o.kind, o.commodity, o.context]);
    const group = groups.get(key) ?? [];
    group.push(t);
    groups.set(key, group);
  }
  const candidates: RecurringAnalysis[] = [];
  for (const [key, ts] of groups) {
    if (ts.length < recurringPolicy.minimumOccurrences) continue;
    const analysis = analyzeRecurring(key, ts, false, asOf);
    if (
      analysis?.rhythm.reliable && analysis.lifecycle !== "possibly-stopped"
    ) candidates.push(analysis);
  }
  return candidates.sort((a, b) => a.key.localeCompare(b.key));
}

export function analyzeConfirmedRecurring(
  sequences: TransactionSequence[],
  asOf: Dayjs,
): RecurringAnalysis[] {
  return sequences.map((s) =>
    analyzeRecurring(s.key, s.transactions, true, asOf, s.period)
  ).filter((s): s is RecurringAnalysis => !!s);
}

export function annualOccurrences(rhythm: Rhythm): number | undefined {
  switch (rhythm.cadence) {
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "half-yearly":
      return 2;
    case "yearly":
      return 1;
    default:
      return rhythm.reliable && rhythm.days > 0 ? 365 / rhythm.days : undefined;
  }
}

export function summarizeRecurring(
  sequences: RecurringAnalysis[],
  asOf: Dayjs,
) {
  const totals = new Map<
    string,
    {
      commodity: string;
      monthly: number;
      annual: number;
      upcoming7: number;
      upcoming30: number;
    }
  >();
  const totalFor = (commodity: string) => {
    const total = totals.get(commodity) ??
      { commodity, monthly: 0, annual: 0, upcoming7: 0, upcoming30: 0 };
    totals.set(commodity, total);
    return total;
  };
  for (const s of sequences) {
    if (!s.confirmed || s.lifecycle === "possibly-stopped") continue;
    if (
      s.kind === "expense" && s.commodity &&
      s.expectedExpenseAmount !== undefined
    ) {
      const total = totalFor(s.commodity);
      if (s.annualFrequency) {
        const annual = new BigNumber(s.expectedExpenseAmount).times(
          s.annualFrequency,
        );
        total.annual = annual.plus(total.annual).toNumber();
        total.monthly = annual.div(12).plus(total.monthly).toNumber();
      }
    }
    if (
      !s.cashObligation || !s.cashCommodity ||
      s.expectedCashOutflowAmount === undefined
    ) continue;
    const total = totalFor(s.cashCommodity);
    for (const date of s.upcomingDates) {
      total.upcoming30 = new BigNumber(total.upcoming30).plus(
        s.expectedCashOutflowAmount,
      ).toNumber();
      if (!date.isAfter(asOf.add(7, "day"), "day")) {
        total.upcoming7 = new BigNumber(total.upcoming7).plus(
          s.expectedCashOutflowAmount,
        ).toNumber();
      }
    }
  }
  return {
    totals: [...totals.values()].sort((a, b) =>
      a.commodity.localeCompare(b.commodity)
    ),
    unestimatedCount:
      sequences.filter((s) =>
        s.confirmed && s.kind === "expense" &&
        s.lifecycle !== "possibly-stopped" && !s.annualFrequency
      ).length,
    attentionCount: sequences.filter(needsRecurringAttention).length,
  };
}

export function needsRecurringAttention(item: RecurringAnalysis): boolean {
  return item.confirmed &&
    (item.flags.amountChanged || item.flags.laterThanUsual ||
      item.flags.cadenceChanged || !!item.scheduleError);
}

export function minimumRecurringChange(commodity?: string): number {
  if (
    commodity && recurringPolicy.minimumChangeAmounts[commodity] !== undefined
  ) return recurringPolicy.minimumChangeAmounts[commodity];
  // No purchasing-power equivalence is inferred for unknown commodities.
  // Use one minor currency unit (or 0.01 for arbitrary commodities) plus the ratio.
  if (commodity && /^[A-Z]{3}$/.test(commodity)) {
    const digits =
      new Intl.NumberFormat("en", { style: "currency", currency: commodity })
        .resolvedOptions().maximumFractionDigits ?? 2;
    return 10 ** -digits;
  }
  return 1 / recurringPolicy.defaultMinorUnits;
}

function analyzeAmounts(amounts: number[], commodity?: string) {
  const latestAmount = amounts.at(-1);
  const previousAmount = amounts.at(-2);
  const typicalAmount = amounts.length ? median(amounts) : undefined;
  const typicalPrevious = amounts.length > 1
    ? median(amounts.slice(0, -1))
    : typicalAmount;
  const baselineStable = amounts.slice(0, -1).every((amount) =>
    Math.abs(amount - (typicalPrevious ?? 0)) <=
      Math.max(0.01, (typicalPrevious ?? 0) * recurringPolicy.stableAmountRatio)
  );
  const approximate = !baselineStable;
  const expectedAmount = approximate ? typicalAmount : latestAmount;
  let amountChange: RecurringAnalysis["amountChange"];
  if (latestAmount !== undefined && previousAmount !== undefined) {
    const difference = new BigNumber(latestAmount).minus(previousAmount)
      .toNumber();
    const ratio = previousAmount > 0
      ? Math.abs(difference) / previousAmount
      : undefined;
    if (
      Math.abs(difference) >= minimumRecurringChange(commodity) &&
      (ratio === undefined || ratio >= recurringPolicy.minimumChangeRatio)
    ) {
      amountChange = {
        previous: previousAmount,
        latest: latestAmount,
        difference,
        percentage: previousAmount
          ? difference / previousAmount * 100
          : undefined,
      };
    }
  }
  return {
    latestAmount,
    previousAmount,
    typicalAmount,
    expectedAmount,
    approximate,
    baselineStable,
    amountChange,
  };
}

function predictRecurringDates(
  lastDate: Dayjs,
  rhythm: Rhythm,
  asOf: Dayjs,
  period: string,
) {
  let expectedDate: Dayjs | undefined;
  let future: Dayjs[] = [];
  let scheduleError: string | undefined;
  let annualFrequency = rhythm.reliable ? annualOccurrences(rhythm) : undefined;
  if (period.trim()) {
    try {
      const cron = parse(prefixMinutesSeconds(period), { hasSeconds: false });
      future = getFutureMatches(cron, {
        startAt: lastDate.add(1, "day").startOf("day").toISOString(),
        endAt: asOf.add(36, "month").toISOString(),
        matchCount: recurringPolicy.maximumSchedules,
        timezone: dayjs.tz?.guess() ?? "UTC",
      }).map((d) => dayjs(d));
      expectedDate = future[0];
      const annualDates = getFutureMatches(cron, {
        startAt: asOf.startOf("day").toISOString(),
        endAt: asOf.add(1, "year").startOf("day").subtract(1, "second")
          .toISOString(),
        matchCount: recurringPolicy.maximumSchedules + 1,
        timezone: dayjs.tz?.guess() ?? "UTC",
      });
      annualFrequency = annualDates.length > 0 &&
          annualDates.length <= recurringPolicy.maximumSchedules
        ? annualDates.length
        : undefined;
    } catch {
      annualFrequency = undefined;
      scheduleError =
        "The explicit Period could not be interpreted. Check its ledger metadata.";
    }
  } else if (rhythm.reliable) {
    expectedDate = advanceOccurrence(lastDate, rhythm);
    for (let i = 1; i <= recurringPolicy.maximumSchedules; i++) {
      const date = advanceOccurrence(lastDate, rhythm, i);
      if (
        date.isAfter(asOf.add(30, "day"), "day") &&
        i > recurringPolicy.stoppedCycles
      ) break;
      future.push(date);
    }
  }
  return { expectedDate, future, scheduleError, annualFrequency };
}
