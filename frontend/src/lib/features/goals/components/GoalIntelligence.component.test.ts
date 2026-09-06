import { cleanup, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, expect, test } from "vitest";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import type { GoalSummary } from "$lib/domain/goals_models";
import { obscure } from "$lib/shared/state/persisted";
import type { Action } from "svelte/action";
import GoalSummaryCard from "./GoalSummaryCard.svelte";
import GoalHealthSummary from "./GoalHealthSummary.svelte";
import SavingsGoalIntelligence from "./SavingsGoalIntelligence.svelte";

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
function goal(overrides: Partial<GoalSummary> = {}): GoalSummary {
  return {
    type: "savings",
    id: "House",
    name: "House",
    icon: "",
    current: 240000,
    target: 600000,
    targetDate: "2027-03-31",
    rate: 0,
    priority: 1,
    contributionHistory: ["2026-06", "2026-07", "2026-08"].map((month) => ({
      month,
      amount: 60000,
    })),
    ...overrides,
  };
}
beforeEach(() => {
  globalThis.__now = dayjs("2026-09-05");
  obscure.set(false);
});
afterEach(() => {
  cleanup();
  obscure.set(false);
});
for (
  const [amount, label] of [[60000, "On track"], [48000, "Behind plan"], [
    10000,
    "At risk",
  ]] as const
) {
  test(`card renders ${label} and monthly pace`, () => {
    const view = render(GoalSummaryCard, {
      goal: goal({
        contributionHistory: goal().contributionHistory?.map((m) => ({
          ...m,
          amount,
        })),
      }),
    });
    expect(view.getByText(label)).toBeInTheDocument();
    expect(view.getByText("Required")).toBeInTheDocument();
    expect(view.getAllByText("60K/mo").length).toBeGreaterThanOrEqual(1);
    expect(view.getByText("Recent pace")).toBeInTheDocument();
  });
}
test("overdue is factual and includes remaining amount", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({ targetDate: "2026-09-04" }),
  });
  expect(view.getByText("Target date has passed")).toBeInTheDocument();
  expect(view.getByText("3.6L")).toBeInTheDocument();
  expect(view.getByText("Remaining")).toBeInTheDocument();
});
test("short history displays required pace without a warning", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({ contributionHistory: [{ month: "2026-08", amount: 900000 }] }),
  });
  expect(view.getByText("More contribution history needed"))
    .toBeInTheDocument();
  expect(view.queryByText("On track")).toBeNull();
  expect(view.queryByText("At risk")).toBeNull();
});
test("completed goal has no contribution warnings and shows Target funded", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({ current: 720000, targetDate: "2020-01-01" }),
  });
  expect(view.getByText("Goal reached")).toBeInTheDocument();
  expect(view.queryByText("Required")).toBeNull();
  expect(view.queryByText("Target date has passed")).toBeNull();
  expect(view.getByText("Target funded")).toBeInTheDocument();
});
test("retirement renders funding and expense basis without schedule claims", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({
      type: "retirement",
      swr: 4,
      yearlyExpense: 24000,
      yearlyExpenseSource: "historical",
      targetDate: "2020-01-01",
    }),
  });
  expect(view.getByText("Tracking")).toBeInTheDocument();
  expect(view.getByText(/40.0% funded/)).toBeInTheDocument();
  expect(view.getByText("Based on historical expenses"))
    .toBeInTheDocument();
  expect(view.queryByText("Target date has passed")).toBeNull();
});
test("retirement target funded and configured expense source", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({
      type: "retirement",
      current: 600000,
      swr: 4,
      yearlyExpense: 24000,
      yearlyExpenseSource: "configured",
    }),
  });
  expect(view.getByText("100%+ funded")).toBeInTheDocument();
  expect(view.getByText("Target funded")).toBeInTheDocument();
  expect(view.getByText("Using configured yearly expenses"))
    .toBeInTheDocument();
});
test("no deadline remains explicit with a payment projection", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({
      targetDate: "",
      contributionHistory: [],
      paymentPerPeriod: 15000,
    }),
  });
  expect(view.getByText("No deadline configured")).toBeInTheDocument();
  expect(view.getByText("At 15K/mo configured payment"))
    .toBeInTheDocument();
});
test("empty overview has no invented metrics or warnings", () => {
  const view = render(GoalHealthSummary, { goals: [] });
  expect(view.container.textContent).toBe("");
});
test("attention excludes unassessable and completed goals", () => {
  const view = render(GoalHealthSummary, {
    goals: [
      goal({ id: "late", name: "Late", targetDate: "2020-01-01" }),
      goal({ id: "done", name: "Done", current: 600000 }),
      goal({ id: "new", name: "New", contributionHistory: [] }),
    ],
  });
  expect(view.getByRole("link", { name: "Late" })).toBeInTheDocument();
  expect(view.queryByRole("link", { name: "Done" })).toBeNull();
  expect(view.queryByRole("link", { name: "New" })).toBeNull();
});
test("card renders compact primary metrics and accessible drag handle", () => {
  const actionMock: Action = () => ({ update: () => {}, destroy: () => {} });
  const view = render(GoalSummaryCard, {
    goal: goal({ current: 240000, target: 600000 }),
    action: actionMock,
  });
  expect(view.getByText("2.4L")).toBeInTheDocument();
  expect(view.getByText("6L")).toBeInTheDocument();
  const handle = view.getByRole("button", { name: "Reorder House goal" });
  expect(handle).toBeInTheDocument();
  expect(handle.querySelector(".fa-grip-vertical")).not.toBeNull();
});
test("long goal name wraps/truncates safely without crashing", () => {
  const view = render(GoalSummaryCard, {
    goal: goal({
      name:
        "A very long descriptive name for a home down payment and family emergency fund",
    }),
  });
  expect(
    view.getByText(
      "A very long descriptive name for a home down payment and family emergency fund",
    ),
  ).toBeInTheDocument();
});
test("privacy masks current, target, required pace, recent pace and remaining on cards and details", async () => {
  const input = goal({
    contributionHistory: goal().contributionHistory?.map((m) => ({
      ...m,
      amount: 48000,
    })),
  });
  const card = render(GoalSummaryCard, { goal: input });
  const detail = render(SavingsGoalIntelligence, {
    goal: input,
    xirr: 7,
    investmentTotal: 210000,
    gainTotal: 30000,
  });
  const summary = render(GoalHealthSummary, { goals: [input] });
  expect(detail.container.textContent).toContain("48,000.00");
  obscure.set(true);
  await waitFor(() => {
    for (const view of [card, detail, summary]) {
      for (
        const amount of [
          "2,40,000",
          "6,00,000",
          "60,000",
          "48,000",
          "3,60,000",
          "12,000",
          "2,10,000",
          "30,000",
        ]
      ) expect(view.container.textContent).not.toContain(amount);
    }
  });
  expect(detail.container.textContent).toContain("0.00");
});
