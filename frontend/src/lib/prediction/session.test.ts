import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { backtest } from "./backtest";
import { buildIndex } from "./index";
import { predictionSession } from "./session";
import type { HistoryPosting } from "./types";

function hist(payee: string, account: string, date: string): HistoryPosting {
  return {
    payee,
    categoryAccount: account,
    amount: 100,
    absoluteAmount: 100,
    date,
    commodity: "INR",
    transactionId: payee + date,
  };
}

describe("prediction session and backtest", () => {
  beforeEach(() => {
    predictionSession.reset();
  });

  it("builds the index only once for the same history", () => {
    const history = [hist("Uber", "Expenses:Travel", "2024-01-01")];
    predictionSession.loadHistory(history);
    predictionSession.loadHistory(history);
    predictionSession.loadHistory(history);
    expect(predictionSession.buildCount).toBe(1);
    expect(predictionSession.index?.postings.length).toBe(1);
  });

  it("rebuilds when committed history changes", () => {
    predictionSession.loadHistory([
      hist("Uber", "Expenses:Travel", "2024-01-01"),
    ]);
    predictionSession.loadHistory([
      hist("Uber", "Expenses:Travel", "2024-01-01"),
      hist("Uber", "Expenses:Travel", "2024-02-01"),
    ]);
    expect(predictionSession.buildCount).toBe(2);
  });

  it("keeps overrides for two predictAccount calls on one row", () => {
    predictionSession.loadHistory([
      hist("Uber", "Expenses:Travel", "2024-01-01"),
      hist("Lyft", "Expenses:Taxi", "2024-01-02"),
    ]);
    const first = predictionSession.predictInput({
      description: "Uber",
      prefix: "Expenses",
      rowIndex: 4,
      helperInvocationIndex: 0,
    });
    const second = predictionSession.predictInput({
      description: "Lyft",
      prefix: "Expenses",
      rowIndex: 4,
      helperInvocationIndex: 1,
    });
    expect(first.account).toBe("Expenses:Travel");
    expect(second.account).toBe("Expenses:Taxi");
    predictionSession.setOverride(4, "Expenses", "Expenses:KeepFirst", 0);
    expect(
      predictionSession.predictInput({
        description: "Uber",
        prefix: "Expenses",
        rowIndex: 4,
        helperInvocationIndex: 0,
      }).account,
    ).toBe("Expenses:KeepFirst");
    expect(
      predictionSession.predictInput({
        description: "Lyft",
        prefix: "Expenses",
        rowIndex: 4,
        helperInvocationIndex: 1,
      }).account,
    ).toBe("Expenses:Taxi");
  });

  it("applies an override to similar merchant rows and skips USER rows", () => {
    predictionSession.loadHistory([
      hist("Netflix", "Expenses:Entertainment", "2024-01-01"),
      hist("Netflix", "Expenses:Entertainment", "2024-02-01"),
    ]);
    predictionSession.predictInput({
      description: "Netflix",
      prefix: "Expenses",
      rowIndex: 0,
    });
    predictionSession.predictInput({
      description: "Netflix",
      prefix: "Expenses",
      rowIndex: 1,
    });
    predictionSession.predictInput({
      description: "Spotify",
      prefix: "Expenses",
      rowIndex: 2,
    });
    predictionSession.setOverride(1, "Expenses", "Expenses:Keep");
    predictionSession.applyToSimilar(0, "Expenses", "Expenses:Subscriptions");
    expect(
      predictionSession.predictInput({
        description: "Netflix",
        prefix: "Expenses",
        rowIndex: 0,
      }).account,
    ).toBe("Expenses:Subscriptions");
    expect(
      predictionSession.predictInput({
        description: "Netflix",
        prefix: "Expenses",
        rowIndex: 1,
      }).account,
    ).toBe("Expenses:Keep");
  });

  it("resolves an SBI UPI narration with no prefix when history exists", () => {
    const sbiRow = {
      A: "12/04/2026",
      B: "WDL TFR UPI/309191771120/AMAZON SELLER SERVICES",
      C: "",
      D: "200.00",
      E: "",
      F: "1200.00",
      index: 8,
    };
    const options = {
      hash: {},
      data: { root: { ROW: sbiRow } },
    };

    expect(predictionSession.predictFromHelper([], options).account).toBe(
      "Unknown",
    );

    predictionSession.loadHistory([
      hist("Amazon", "Expenses:Subscriptions", "2024-01-01"),
      hist("Amazon", "Expenses:Subscriptions", "2024-02-01"),
    ]);
    expect(predictionSession.predictFromHelper([], options).account).toBe(
      "Expenses:Subscriptions",
    );
  });

  it("runs a chronological backtest without wall-clock timing", () => {
    const history = [
      hist("Uber", "Expenses:Travel", "2024-01-01"),
      hist("Uber", "Expenses:Travel", "2024-02-01"),
      hist("Uber", "Expenses:Travel", "2024-03-01"),
      hist("NewPlace", "Expenses:Food", "2024-04-01"),
    ];
    const result = backtest(history);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(3);
    expect(result.correct).toBeGreaterThanOrEqual(2);
    expect(buildIndex(history).postings.length).toBe(4);
  });
});
