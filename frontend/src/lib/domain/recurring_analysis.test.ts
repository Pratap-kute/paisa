import "dayjs/plugin/isSameOrBefore.js";
import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import type { Posting, Transaction } from "./ledger";
import type { TransactionSequence } from "./recurring";
import {
  advanceOccurrence,
  analyzeRecurring,
  discoverRecurringCandidates,
  economicOccurrence,
  inferCadence,
  summarizeRecurring,
} from "./recurring_analysis";
dayjs.extend(utc);
dayjs.extend(timezone);
const asOf = dayjs("2026-08-10");
function tx(
  date: string,
  amount = 499,
  account = "Expenses:Entertainment",
  payee = "NETFLIX.COM 839273",
  commodity = "INR",
  source = "Assets:Bank",
): Transaction {
  const postings = [{ account, quantity: amount, commodity }, {
    account: source,
    quantity: -amount,
    commodity,
  }].map((p) => ({ ...p, amount: p.quantity, tag_recurring: "" } as Posting));
  return {
    id: `${date}:${payee}:${source}:${commodity}`,
    date: dayjs(date),
    payee,
    postings,
    beginLine: 1,
    endLine: 3,
    fileName: "main.ledger",
  };
}
function monthly(amounts = [499, 499, 499]) {
  return amounts.map((amount, i) =>
    tx(`2026-${String(i + 6).padStart(2, "0")}-08`, amount)
  );
}
function analysis(ts = monthly(), date = asOf, confirmed = true) {
  return analyzeRecurring("Netflix", ts, confirmed, date)!;
}

describe("recurring cadence and prediction", () => {
  const cases: [string[], string][] = [
    [["2026-01-08", "2026-02-08", "2026-03-08"], "monthly"],
    [["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"], "monthly"],
    [["2026-06-08", "2026-07-09", "2026-08-07", "2026-09-08"], "monthly"],
    [["2026-06-01", "2026-06-08", "2026-06-15"], "weekly"],
    [["2026-06-01", "2026-06-15", "2026-06-29"], "biweekly"],
    [["2025-10-31", "2026-01-31", "2026-04-30"], "quarterly"],
    [["2024-02-29", "2025-02-28", "2026-02-28"], "yearly"],
    [["2026-06-01", "2026-06-11", "2026-06-21", "2026-07-01"], "custom"],
  ];
  for (const [dates, cadence] of cases) {
    it(`${cadence}: ${dates.join(", ")}`, () => {
      const rhythm = inferCadence(dates.map((d) => dayjs(d)));
      expect(rhythm.cadence).toBe(cadence);
      expect(rhythm.reliable).toBe(true);
    });
  }
  it("retains a month-end anchor through February including leap years", () => {
    const rhythm = inferCadence(
      ["2023-11-30", "2023-12-31", "2024-01-31"].map((d) => dayjs(d)),
    );
    expect(advanceOccurrence(dayjs("2024-01-31"), rhythm).format("YYYY-MM-DD"))
      .toBe("2024-02-29");
    expect(advanceOccurrence(dayjs("2024-02-29"), rhythm).format("YYYY-MM-DD"))
      .toBe("2024-03-31");
  });
  it("does not suggest short or irregular histories", () => {
    for (
      const ts of [[], monthly().slice(0, 1), monthly().slice(0, 2), [
        tx("2026-01-01"),
        tx("2026-01-03"),
        tx("2026-03-15"),
      ]]
    ) expect(discoverRecurringCandidates(ts, [], asOf)).toHaveLength(0);
  });
  it("preserves manual tags with insufficient or irregular evidence", () => {
    const item = analysis([tx("2026-08-01")]);
    expect(item.confirmed).toBe(true);
    expect(item.expectedDate).toBeUndefined();
    expect(analysis([tx("2026-01-01"), tx("2026-02-20")]).confirmed).toBe(true);
  });
  it("respects explicit Period even with only one occurrence", () => {
    const item = analyzeRecurring(
      "Manual",
      [tx("2026-08-01")],
      true,
      asOf,
      "15 * ?",
    )!;
    expect(item.expectedDate?.format("YYYY-MM-DD")).toBe("2026-08-15");
    const bad = analyzeRecurring(
      "Manual",
      monthly(),
      true,
      asOf,
      "not a schedule",
    )!;
    expect(bad.scheduleError).toBeDefined();
    expect(bad.expectedDate).toBeUndefined();
  });
});

describe("merchant and financial semantics", () => {
  it("normalizes supported bank noise, counts transactions once and does not mutate history", () => {
    const ts = monthly();
    ts[1].payee = "NETFLIX.COM*8392";
    const before = JSON.stringify(ts);
    const found = discoverRecurringCandidates([...ts, ts[0]], [], asOf);
    expect(found).toHaveLength(1);
    expect(found[0].transactions).toHaveLength(3);
    expect(found[0].latestAmount).toBe(499);
    expect(JSON.stringify(ts)).toBe(before);
  });
  it("separates accounts, commodities and unrelated merchants", () => {
    const ts = monthly();
    ts[1].payee = "Netflix MUMBAI";
    expect(discoverRecurringCandidates(ts, [], asOf)).toHaveLength(0);
    const all = [
      ...monthly(),
      ...monthly().map((t) =>
        tx(
          t.date.format("YYYY-MM-DD"),
          20,
          "Expenses:Entertainment",
          "Netflix",
          "USD",
          "Liabilities:Card",
        )
      ),
    ];
    expect(discoverRecurringCandidates(all, [], asOf)).toHaveLength(2);
  });
  it("excludes existing recurring identities from suggestions", () => {
    const ts = monthly();
    const sequences = [{
      key: "Netflix",
      transactions: ts,
    }] as TransactionSequence[];
    expect(discoverRecurringCandidates(ts, sequences, asOf)).toHaveLength(0);
    ts[0].tag_recurring = "Netflix";
    expect(discoverRecurringCandidates(ts, [], asOf)).toHaveLength(0);
  });
  it("keeps income, investments, card repayment and transfers out of expense totals", () => {
    const kinds: [string, number, string][] = [
      ["Income:Salary", -85000, "income"],
      ["Assets:Broker", 10000, "investment"],
      ["Assets:Savings", 10000, "transfer"],
      ["Liabilities:Card", 10000, "transfer"],
    ];
    const items = kinds.map(([account, amount, kind]) => {
      const ts = monthly().map((t) =>
        tx(t.date.format("YYYY-MM-DD"), amount, account)
      );
      const item = analysis(ts);
      expect(item.kind).toBe(kind);
      return item;
    });
    expect(summarizeRecurring(items, asOf).totals).toHaveLength(0);
    expect(summarizeRecurring([...items, analysis()], asOf).totals[0].monthly)
      .toBe(499);
    expect(economicOccurrence(tx("2026-08-01", -10))).toBeUndefined();
  });
});

describe("amounts, lifecycle and summary", () => {
  it("uses medians, detects meaningful changes, and preserves variable bills", () => {
    const changed = analysis(monthly([499, 499, 649]));
    expect(changed.typicalAmount).toBe(499);
    expect(changed.expectedAmount).toBe(649);
    expect(changed.amountChange?.difference).toBe(150);
    expect(analysis(monthly([499, 499, 499])).amountChange).toBeUndefined();
    expect(analysis(monthly([10, 10, 15])).amountChange).toBeUndefined();
    expect(analysis(monthly([649, 649, 499])).amountChange?.difference).toBe(
      -150,
    );
    const variable = analysis(
      monthly([1200, 1500, 1000, 1700]),
      dayjs("2026-09-10"),
    );
    expect(variable.rhythm.cadence).toBe("monthly");
    expect(variable.approximate).toBe(true);
    expect(variable.expectedAmount).toBe(1350);
  });
  it("distinguishes new, upcoming, late and possibly stopped conservatively", () => {
    expect(analysis().lifecycle).toBe("new");
    expect(analysis(monthly(), dayjs("2026-09-05")).flags.expectedSoon).toBe(
      true,
    );
    expect(analysis(monthly(), dayjs("2026-09-10")).flags.laterThanUsual).toBe(
      false,
    );
    expect(analysis(monthly(), dayjs("2026-09-12")).flags.laterThanUsual).toBe(
      true,
    );
    expect(analysis(monthly(), dayjs("2026-09-12")).lifecycle).toBe("active");
    expect(analysis(monthly(), dayjs("2026-10-12")).lifecycle).toBe(
      "possibly-stopped",
    );
  });
  it("excludes candidates and stopped items and keeps native commodities separate", () => {
    const usd = analysis(
      monthly().map((t) =>
        tx(
          t.date.format("YYYY-MM-DD"),
          20,
          "Expenses:Entertainment",
          "Netflix",
          "USD",
        )
      ),
    );
    const summary = summarizeRecurring([
      analysis(),
      usd,
      analysis(monthly(), asOf, false),
      analysis(monthly(), dayjs("2026-10-12")),
    ], asOf);
    expect(summary.totals).toHaveLength(2);
    expect(summary.totals[0].annual).toBe(5988);
    expect(summary.totals[0].upcoming30).toBe(499);
  });
  it("counts every weekly occurrence inside the horizon", () => {
    const ts = ["2026-07-27", "2026-08-03", "2026-08-10"].map((date) =>
      tx(date, 100)
    );
    const item = analysis(ts, asOf);
    const totals = summarizeRecurring([item], asOf).totals[0];
    expect(totals.annual).toBe(5200);
    expect(totals.monthly).toBeCloseTo(5200 / 12);
    expect(totals.upcoming7).toBe(100);
    expect(totals.upcoming30).toBe(400);
  });
});

it("uses explicit annual schedules for totals instead of historical monthly inference", () => {
  const item = analyzeRecurring("Annual", monthly(), true, asOf, "8 SEP ?")!;
  expect(item.annualFrequency).toBe(1);
  expect(summarizeRecurring([item], asOf).totals[0].annual).toBe(499);
});

it("never aggregates an explicitly tagged sequence across mixed commodities", () => {
  const ts = monthly();
  ts[1].postings.forEach((p) => {
    p.commodity = "USD";
  });
  const item = analysis(ts);
  expect(item.confirmed).toBe(true);
  expect(item.expectedAmount).toBeUndefined();
  expect(summarizeRecurring([item], asOf).totals).toHaveLength(0);
});

it("annualizes biweekly, quarterly and yearly commitments correctly", () => {
  const items = [
    ["2026-07-01", "2026-07-15", "2026-07-29"],
    ["2026-01-08", "2026-04-08", "2026-07-08"],
    ["2024-08-08", "2025-08-08", "2026-08-08"],
  ].map((dates) => analysis(dates.map((d) => tx(d, 100))));
  const total = summarizeRecurring(items, asOf).totals[0];
  expect(total.annual).toBe(3100);
  expect(total.monthly).toBeCloseTo(3100 / 12);
});

it("preserves confirmed identities and transaction history from existing recurring fixtures", async () => {
  const { analyzeConfirmedRecurring } = await import("./recurring_analysis");
  for (
    const fixture of [
      "browser",
      "inr",
      "eur",
      "inr-hledger",
      "eur-hledger",
      "inr-beancount",
    ]
  ) {
    const input = JSON.parse(
      Deno.readTextFileSync(
        new URL(
          `../../../tests/fixture/${fixture}/recurring.json`,
          import.meta.url,
        ),
      ),
      (key, value) =>
        key === "date" && typeof value === "string" ? dayjs(value) : value,
    ) as { transaction_sequences: TransactionSequence[] };
    const before = JSON.stringify(input);
    const items = analyzeConfirmedRecurring(
      input.transaction_sequences,
      dayjs("2026-09-05"),
    );
    expect(items.map((item) => item.key)).toEqual(
      input.transaction_sequences.map((item) => item.key),
    );
    for (const item of items) {
      const source = input.transaction_sequences.find((sequence) =>
        sequence.key === item.key
      )!;
      expect(item.transactions.map((t) => t.id).sort()).toEqual(
        source.transactions.map((t) => t.id).sort(),
      );
    }
    expect(JSON.stringify(input)).toBe(before);
  }
});

it("handles zero amounts and invalid numeric data without non-finite output", () => {
  const item = analysis(monthly([0, 0, 15]));
  expect(item.amountChange?.percentage).toBeUndefined();
  expect(JSON.stringify(item)).not.toContain("Infinity");
  expect(economicOccurrence(tx("2026-08-08", Number.NaN))).toBeUndefined();
  expect(economicOccurrence(tx("2026-08-08", Number.POSITIVE_INFINITY)))
    .toBeUndefined();
});
