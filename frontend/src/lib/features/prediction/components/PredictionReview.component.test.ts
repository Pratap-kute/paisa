import { render } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import PredictionRowBadge from "./PredictionRowBadge.svelte";
import PredictionReviewBar from "./PredictionReviewBar.svelte";
import PredictionDetail from "./PredictionDetail.svelte";
import { emptyBreakdown } from "$lib/features/prediction/score";
import type { PredictionResult } from "$lib/features/prediction/types";

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
  const buttons = container.querySelectorAll("button.paisa-review-chip");
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

test("renders resolved badge with checkmark and quiet style", () => {
  const { container } = render(PredictionRowBadge, {
    confidence: "NEEDS_REVIEW",
    resolved: true,
  });
  const badge = container.querySelector(".paisa-prediction-badge");
  expect(badge).toHaveClass("is-quiet");
  expect(badge).toHaveClass("is-resolved");
  expect(container.querySelector(".fa-check")).not.toBeNull();
});

test("renders progress and handles Review Next in review bar", () => {
  const onReviewNext = vi.fn();
  const { container } = render(PredictionReviewBar, {
    counts: { high: 1, medium: 0, review: 2, unknown: 1, transfer: 0 },
    filter: null,
    progress: {
      total: 3,
      reviewed: 1,
      remaining: 2,
      percent: 33,
    },
    onFilter: vi.fn(),
    onReviewNext,
  });

  expect(container.textContent).toContain("1/3 reviewed");
  const nextBtn = container.querySelector(
    '[data-testid="review-next-btn"]',
  ) as HTMLButtonElement;
  expect(nextBtn).not.toBeNull();
  nextBtn.click();
  expect(onReviewNext).toHaveBeenCalledOnce();
});

test("renders all reviewed badge when no remaining items", () => {
  const { container } = render(PredictionReviewBar, {
    counts: { high: 2, medium: 0, review: 1, unknown: 0, transfer: 0 },
    filter: null,
    progress: {
      total: 3,
      reviewed: 3,
      remaining: 0,
      percent: 100,
    },
    onFilter: vi.fn(),
  });

  expect(container.textContent).toContain("All reviewed");
  expect(container.querySelector('[data-testid="all-reviewed-badge"]')).not
    .toBeNull();
  expect(container.querySelector('[data-testid="review-next-btn"]')).toBeNull();
});

test("renders queue badge, source card, multi-tabs, and handles action clicks in PredictionDetail", () => {
  const result: PredictionResult = {
    account: "Expenses:Food",
    confidence: "NEEDS_REVIEW",
    score: 55,
    support: 2,
    margin: 5,
    reasons: ["HISTORY"],
    alternatives: [],
    possibleTransfer: false,
    merchantKey: "uber",
    source: "HISTORY",
    breakdown: emptyBreakdown(),
    debug: "",
    prefix: "Expenses",
    helperInvocationIndex: 0,
  };

  const secondResult: PredictionResult = {
    ...result,
    account: "Liabilities:CreditCard",
    prefix: "Liabilities",
    helperInvocationIndex: 1,
  };

  const onConfirmNext = vi.fn();
  const onAlwaysUse = vi.fn();
  const onApplySimilar = vi.fn();
  const onSelectPrediction = vi.fn();

  const { container } = render(PredictionDetail, {
    result,
    input: {
      date: "2026-03-01",
      description: "UBER TRIP HELP",
      amount: -25.5,
      commodity: "USD",
      sourceAccount: "Assets:Checking",
      prefix: "Expenses",
    },
    accounts: ["Expenses:Food", "Liabilities:CreditCard"],
    queueIndex: 2,
    queueTotal: 5,
    similarCount: 3,
    rowPredictions: [result, secondResult],
    reviewStatus: "CORRECTED",
    onConfirmNext,
    onAlwaysUse,
    onApplySimilar,
    onSelectPrediction,
  });

  // Queue badge and review status
  expect(container.textContent).toContain("Review 2 of 5");
  expect(container.textContent).toContain("Corrected");

  // Source transaction card
  const sourceCard = container.querySelector('[data-testid="source-card"]');
  expect(sourceCard).not.toBeNull();
  expect(sourceCard?.textContent).toContain("2026-03-01");
  expect(sourceCard?.textContent).toContain("UBER TRIP HELP");
  expect(sourceCard?.textContent).toContain("Assets:Checking");
  expect(sourceCard?.textContent).toContain("-25.5 USD");

  // Multi-prediction switcher tabs
  const tabs = container.querySelectorAll(".paisa-switcher-tab");
  expect(tabs.length).toBe(2);
  expect(tabs[0]).toHaveClass("is-active");
  (tabs[1] as HTMLButtonElement).click();
  expect(onSelectPrediction).toHaveBeenCalledWith(secondResult);

  // Dynamic similar count button
  const applyBtn = container.querySelector(
    '[data-testid="apply-similar-btn"]',
  ) as HTMLButtonElement;
  expect(applyBtn.textContent).toContain(
    "Apply to 3 similar rows in this import",
  );
  expect(applyBtn.disabled).toBe(false);
  applyBtn.click();
  expect(onApplySimilar).toHaveBeenCalledWith("Expenses:Food");

  // Always use merchant button
  const alwaysBtn = container.querySelector(
    '[data-testid="always-use-merchant-btn"]',
  ) as HTMLButtonElement;
  alwaysBtn.click();
  expect(onAlwaysUse).toHaveBeenCalledWith("Expenses:Food");

  // Confirm / Next review button
  const confirmBtn = container.querySelector(
    '[data-testid="confirm-next-btn"]',
  ) as HTMLButtonElement;
  confirmBtn.click();
  expect(onConfirmNext).toHaveBeenCalledOnce();
});

test("disables apply similar button when similarCount is 0", () => {
  const result: PredictionResult = {
    account: "Expenses:Utilities",
    confidence: "UNKNOWN",
    score: 0,
    support: 0,
    margin: 0,
    reasons: [],
    alternatives: [],
    possibleTransfer: false,
    merchantKey: "electric",
    source: "NONE",
    breakdown: emptyBreakdown(),
    debug: "",
    prefix: "Expenses",
    helperInvocationIndex: 0,
  };

  const { container } = render(PredictionDetail, {
    result,
    accounts: ["Expenses:Utilities"],
    similarCount: 0,
  });

  const applyBtn = container.querySelector(
    '[data-testid="apply-similar-btn"]',
  ) as HTMLButtonElement;
  expect(applyBtn.disabled).toBe(true);
  expect(applyBtn.textContent).toContain("0 found");
});
