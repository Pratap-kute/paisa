import { render } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import PredictionRowBadge from "./PredictionRowBadge.svelte";
import PredictionReviewBar from "./PredictionReviewBar.svelte";
import PredictionDetail from "./PredictionDetail.svelte";
import { emptyBreakdown } from "$lib/prediction/score";
import type { PredictionResult } from "$lib/prediction/types";

test("renders a quiet high badge and a louder review badge", () => {
  const high = render(PredictionRowBadge, { confidence: "HIGH" });
  expect(high.container.querySelector(".paisa-prediction-badge")).toHaveClass(
    "is-quiet",
  );
  high.unmount();

  const review = render(PredictionRowBadge, {
    confidence: "NEEDS_REVIEW",
    possibleTransfer: true,
  });
  expect(review.container.textContent).toContain("Transfer");
  expect(review.container.querySelector(".paisa-prediction-badge"))
    .not.toHaveClass("is-quiet");
});

test("filters counts from the review bar", () => {
  const onFilter = vi.fn();
  const { container } = render(PredictionReviewBar, {
    counts: { high: 2, medium: 1, review: 3, unknown: 4, transfer: 1 },
    filter: null,
    onFilter,
  });
  expect(container.textContent).toContain("High 2");
  expect(container.textContent).toContain("Unknown 4");
  const buttons = container.querySelectorAll("button.tag");
  (buttons[0] as HTMLButtonElement).click();
  expect(onFilter).toHaveBeenCalledWith("HIGH");
});

test("shows override actions for a selected prediction", () => {
  const result: PredictionResult = {
    account: "Expenses:Food",
    confidence: "MEDIUM",
    score: 60,
    support: 2,
    margin: 10,
    reasons: ["EXACT_MERCHANT", "HISTORY"],
    alternatives: [{
      account: "Expenses:Groceries",
      score: 40,
      support: 1,
      reasons: ["SIMILARITY"],
    }],
    possibleTransfer: false,
    merchantKey: "starbucks",
    source: "HISTORY",
    breakdown: emptyBreakdown(),
    debug: "account=Expenses:Food",
    prefix: "Expenses",
    helperInvocationIndex: 0,
  };
  const onOverride = vi.fn();
  const { container } = render(PredictionDetail, {
    result,
    accounts: ["Expenses:Food", "Expenses:Groceries"],
    onOverride,
    onApplySimilar: vi.fn(),
    onAlwaysUse: vi.fn(),
  });
  expect(container.textContent).toContain("Exact merchant match");
  expect(container.textContent).toContain(
    "Apply to similar rows in this import",
  );
  const alternative = [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("Expenses:Groceries")
  );
  alternative?.click();
  expect(onOverride).toHaveBeenCalledWith("Expenses:Groceries");
});
