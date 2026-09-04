import { beforeEach, describe, expect, it } from "vitest";
import { predictionSession } from "$lib/features/prediction/session";
import type { HistoryPosting } from "$lib/features/prediction/types";

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

describe("prediction session core coverage", () => {
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

    predictionSession.setOverride(0, "Expenses", "Expenses:Media", 0);
    predictionSession.applyToSimilar(0, "Expenses", "Expenses:Media");

    expect(
      predictionSession.predictInput({
        description: "Netflix",
        prefix: "Expenses",
        rowIndex: 1,
      }).account,
    ).toBe("Expenses:Media");

    expect(
      predictionSession.predictInput({
        description: "Spotify",
        prefix: "Expenses",
        rowIndex: 2,
      }).account,
    ).not.toBe("Expenses:Media");
  });

  it("resolves an SBI UPI narration with no prefix when history exists", () => {
    predictionSession.loadHistory([
      hist("Swiggy", "Expenses:Food", "2024-01-01"),
    ]);
    const result = predictionSession.predictInput({
      description: "UPI/12345/SWIGGY/BANGALORE",
      rowIndex: 0,
    });
    expect(result.account).toBe("Expenses:Food");
  });

  it("confirms a prediction as ACCEPTED and removes it from the review queue", () => {
    predictionSession.predictInput({
      description: "Mysterious Merchant",
      prefix: "Expenses",
      rowIndex: 0,
      helperInvocationIndex: 0,
    });

    expect(predictionSession.unresolvedPredictions().length).toBe(1);
    expect(predictionSession.reviewProgress()).toMatchObject({
      total: 1,
      reviewed: 0,
      remaining: 1,
      percent: 0,
    });
    expect(predictionSession.isRowResolved(0)).toBe(false);

    const res = predictionSession.confirmPrediction(
      0,
      "Expenses",
      undefined,
      0,
    );
    expect(res.status).toBe("ACCEPTED");
    expect(predictionSession.unresolvedPredictions().length).toBe(0);
    expect(predictionSession.reviewProgress()).toMatchObject({
      totalRows: 1,
      reviewRequiredRows: 1,
      reviewedRows: 1,
      unresolvedRows: 0,
      percent: 100,
    });
    expect(predictionSession.isRowResolved(0)).toBe(true);

    const state = predictionSession.getReviewState(0, 0, "Expenses");
    expect(state?.status).toBe("ACCEPTED");
    expect(state?.currentAccount).toBe("Expenses:Unknown");
    expect(state?.initialAccount).toBe("Expenses:Unknown");
    expect(state?.wasReviewRequired).toBe(true);
    expect(state?.inputFingerprint).toBeTruthy();
  });

  it("confirms a prediction as CORRECTED when an account is changed", () => {
    predictionSession.predictInput({
      description: "Mysterious Merchant",
      prefix: "Expenses",
      rowIndex: 0,
      helperInvocationIndex: 0,
    });

    const res = predictionSession.confirmPrediction(
      0,
      "Expenses",
      "Expenses:Dining",
      0,
    );
    expect(res.status).toBe("CORRECTED");
    expect(res.account).toBe("Expenses:Dining");
    expect(predictionSession.unresolvedPredictions().length).toBe(0);
    expect(predictionSession.isRowResolved(0)).toBe(true);

    const state = predictionSession.getReviewState(0, 0, "Expenses");
    expect(state?.status).toBe("CORRECTED");
    expect(state?.currentAccount).toBe("Expenses:Dining");
    expect(state?.wasReviewRequired).toBe(true);
  });

  it("prioritizes review queue order: UNKNOWN -> TRANSFER -> NEEDS_REVIEW", () => {
    predictionSession.loadHistory([
      hist("SplitStore", "Expenses:MiscA", "2024-01-01"),
      hist("SplitStore", "Expenses:MiscA", "2024-01-02"),
      hist("SplitStore", "Expenses:MiscB", "2024-01-03"),
      hist("SplitStore", "Expenses:MiscB", "2024-01-04"),
    ]);
    predictionSession.predictInput({
      description: "SplitStore",
      prefix: "Expenses",
      rowIndex: 0,
    });
    predictionSession.predictInput({
      description: "Unknown Merchant A",
      prefix: "Expenses",
      rowIndex: 1,
    });
    predictionSession.predictInput({
      description: "Unknown Merchant B",
      prefix: "Expenses",
      rowIndex: 2,
    });
    predictionSession.predictInput({
      description: "Transfer to Savings",
      amount: 500,
      date: "2024-01-02",
      prefix: "Assets",
      rowIndex: 3,
    });
    predictionSession.predictInput({
      description: "Transfer from Checking",
      amount: -500,
      date: "2024-01-02",
      prefix: "Assets",
      rowIndex: 4,
    });
    predictionSession.finalizeCurrentImport();

    const queue = predictionSession.unresolvedPredictions();
    const confidences = queue.map((r) => ({
      rowIndex: r.rowIndex,
      confidence: r.confidence,
      transfer: r.possibleTransfer,
    }));

    expect(confidences[0].confidence).toBe("UNKNOWN");
    expect(confidences[0].rowIndex).toBe(1);
    expect(confidences[1].confidence).toBe("UNKNOWN");
    expect(confidences[1].rowIndex).toBe(2);

    const transferIndices = confidences
      .map((c, i) => (c.transfer ? i : -1))
      .filter((i) => i !== -1);
    expect(transferIndices.length).toBeGreaterThan(0);
    expect(transferIndices[0]).toBe(2);

    const row0 = confidences.find((c) => c.rowIndex === 0);
    expect(row0?.confidence).toBe("NEEDS_REVIEW");
    expect(confidences[confidences.length - 1].rowIndex).toBe(0);
  });

  it("requires all predictions on a multi-invocation row to be resolved and tracks row counts", () => {
    predictionSession.predictInput({
      description: "Split Merchant",
      prefix: "Expenses",
      rowIndex: 5,
      helperInvocationIndex: 0,
    });
    predictionSession.predictInput({
      description: "Split Fee",
      prefix: "Expenses",
      rowIndex: 5,
      helperInvocationIndex: 1,
    });

    const initialProgress = predictionSession.reviewProgress();
    expect(initialProgress.totalRows).toBe(1);
    expect(initialProgress.reviewRequiredRows).toBe(1);
    expect(initialProgress.reviewedRows).toBe(0);
    expect(initialProgress.unresolvedRows).toBe(1);

    expect(predictionSession.isRowResolved(5)).toBe(false);
    expect(predictionSession.unresolvedRows()).toEqual([5]);

    predictionSession.confirmPrediction(5, "Expenses", "Expenses:Groceries", 0);
    expect(predictionSession.isRowResolved(5)).toBe(false);
    expect(predictionSession.unresolvedRows()).toEqual([5]);
    expect(predictionSession.reviewProgress().reviewedRows).toBe(0);

    predictionSession.confirmPrediction(5, "Expenses", "Expenses:Fees", 1);
    expect(predictionSession.isRowResolved(5)).toBe(true);
    expect(predictionSession.unresolvedRows()).toEqual([]);
    expect(predictionSession.reviewProgress().reviewedRows).toBe(1);
    expect(predictionSession.reviewProgress().unresolvedRows).toBe(0);
  });

  it("applies to similar rows across all confidence tiers and counts unique source rows", () => {
    predictionSession.loadHistory([
      hist("Starbucks", "Expenses:Coffee", "2024-01-01"),
      hist("Starbucks", "Expenses:Coffee", "2024-01-02"),
      hist("Starbucks", "Expenses:Coffee", "2024-01-03"),
    ]);

    predictionSession.predictInput({
      description: "Starbucks",
      prefix: "Expenses",
      rowIndex: 1,
    });
    predictionSession.predictInput({
      description: "Starbucks",
      prefix: "Expenses",
      rowIndex: 2,
    });
    predictionSession.predictInput({
      description: "Starbucks",
      prefix: "Expenses",
      rowIndex: 3,
    });
    predictionSession.predictInput({
      description: "Supermarket",
      prefix: "Expenses",
      rowIndex: 4,
    });

    expect(predictionSession.similarPredictionsCount(1, "Expenses")).toBe(2);

    const { appliedCount } = predictionSession.applyToSimilar(
      1,
      "Expenses",
      "Expenses:Beverages",
    );
    expect(appliedCount).toBe(3);

    expect(predictionSession.getReviewState(1, 0, "Expenses")?.currentAccount)
      .toBe("Expenses:Beverages");
    expect(predictionSession.getReviewState(2, 0, "Expenses")?.currentAccount)
      .toBe("Expenses:Beverages");
    expect(predictionSession.getReviewState(3, 0, "Expenses")?.currentAccount)
      .toBe("Expenses:Beverages");
  });

  it("preserves review states across beginRender() template re-evaluations with matching fingerprint", () => {
    predictionSession.predictInput({
      description: "Zepto Delivery",
      prefix: "Expenses",
      rowIndex: 0,
    });

    predictionSession.confirmPrediction(0, "Expenses", "Expenses:Groceries");
    expect(predictionSession.isRowResolved(0)).toBe(true);

    predictionSession.beginRender();
    predictionSession.predictInput({
      description: "Zepto Delivery",
      prefix: "Expenses",
      rowIndex: 0,
    });

    expect(predictionSession.isRowResolved(0)).toBe(true);
    expect(predictionSession.getReviewState(0, 0, "Expenses")?.currentAccount)
      .toBe("Expenses:Groceries");
  });

  it("resets review state and override when template edit materially changes input fingerprint", () => {
    predictionSession.predictInput({
      description: "Amazon Shopping",
      amount: -50,
      prefix: "Expenses",
      rowIndex: 0,
    });

    predictionSession.confirmPrediction(0, "Expenses", "Expenses:Shopping");
    expect(predictionSession.isRowResolved(0)).toBe(true);
    expect(predictionSession.getReviewState(0, 0, "Expenses")?.currentAccount)
      .toBe("Expenses:Shopping");

    predictionSession.beginRender();
    predictionSession.predictInput({
      description: "Swiggy Delivery",
      amount: -15,
      prefix: "Expenses",
      rowIndex: 0,
    });

    const state = predictionSession.getReviewState(0, 0, "Expenses");
    expect(state?.status).toBe("UNREVIEWED");
    expect(state?.currentAccount).not.toBe("Expenses:Shopping");
  });

  it("prunes review states and overrides for rows removed after template edit", () => {
    predictionSession.predictInput({
      description: "Row Zero",
      prefix: "Expenses",
      rowIndex: 0,
    });
    predictionSession.predictInput({
      description: "Row One",
      prefix: "Expenses",
      rowIndex: 1,
    });

    predictionSession.confirmPrediction(0, "Expenses", "Expenses:A");
    predictionSession.confirmPrediction(1, "Expenses", "Expenses:B");

    predictionSession.beginRender();
    predictionSession.predictInput({
      description: "Row Zero",
      prefix: "Expenses",
      rowIndex: 0,
    });
    predictionSession.finalizeCurrentImport();

    expect(predictionSession.getReviewState(0, 0, "Expenses")).toBeDefined();
    expect(predictionSession.getReviewState(1, 0, "Expenses")).toBeUndefined();
  });
});
