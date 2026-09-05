import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import dayjs from "dayjs";
import type { Posting, Transaction } from "$lib/domain/ledger";
import { analyzeRecurring } from "$lib/domain/recurring_analysis";
import RecurringIntelligence from "./RecurringIntelligence.svelte";
import RecurringIntelligenceRow from "./RecurringIntelligenceRow.svelte";

const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  prepare: vi.fn(),
  save: vi.fn(),
}));
vi.mock(
  "$lib/api",
  () => ({ api: { transaction: { getTransactions: mocks.history } } }),
);
vi.mock(
  "../recurring_confirmation",
  () => ({
    prepareRecurringConfirmation: mocks.prepare,
    saveRecurringConfirmation: mocks.save,
  }),
);
function history(amounts = [499, 499, 649]): Transaction[] {
  return amounts.map((amount, i) => ({
    id: String(i),
    date: dayjs(`2026-0${i + 6}-08`),
    payee: "Netflix",
    fileName: "main.ledger",
    beginLine: i * 4 + 1,
    endLine: i * 4 + 3,
    postings: [{
      account: "Expenses:Entertainment",
      commodity: "INR",
      quantity: amount,
    }, {
      account: "Assets:Bank",
      commodity: "INR",
      quantity: -amount,
    }] as Posting[],
  }));
}
afterEach(() => cleanup());
beforeEach(() => {
  vi.clearAllMocks();
  globalThis.__now = dayjs("2026-08-10");
  USER_CONFIG.readonly = false;
  mocks.history.mockResolvedValue({ transactions: history() });
  mocks.prepare.mockResolvedValue([{ name: "main.ledger" }]);
  mocks.save.mockResolvedValue(undefined);
});
test("renders a candidate and removes rejection from the current review", async () => {
  const view = render(RecurringIntelligence, {
    sequences: [],
    onreload: vi.fn(),
  });
  const reject = await view.findByRole("button", {
    name: "Mark Netflix not recurring",
  });
  expect(view.container.textContent).toContain("3 occurrences");
  await fireEvent.click(reject);
  expect(view.queryByRole("button", { name: "Confirm Netflix recurring" }))
    .toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});
test("confirmation persists before refreshing and announces success", async () => {
  const reload = vi.fn().mockResolvedValue(undefined);
  const view = render(RecurringIntelligence, {
    sequences: [],
    onreload: reload,
  });
  await fireEvent.click(
    await view.findByRole("button", { name: "Confirm Netflix recurring" }),
  );
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  await waitFor(() =>
    expect(view.container.textContent).toContain(
      "Recurring tags saved to the ledger",
    )
  );
  expect(reload).toHaveBeenCalledOnce();
});
test("failed confirmation does not claim success", async () => {
  mocks.save.mockRejectedValue(new Error("Disk is full"));
  const view = render(RecurringIntelligence, {
    sequences: [],
    onreload: vi.fn().mockResolvedValue(undefined),
  });
  await fireEvent.click(
    await view.findByRole("button", { name: "Confirm Netflix recurring" }),
  );
  expect((await view.findByRole("alert")).textContent).toContain(
    "Disk is full",
  );
  expect(view.container.textContent).not.toContain(
    "Recurring tags saved to the ledger",
  );
});
test("handles no history and no upcoming data", async () => {
  mocks.history.mockResolvedValue({ transactions: [] });
  const view = render(RecurringIntelligence, {
    sequences: [],
    onreload: vi.fn(),
  });
  await waitFor(() =>
    expect(view.container.textContent).toContain("Not enough history")
  );
  expect(view.container.textContent).toContain(
    "No recurring payments expected",
  );
});
test("read-only mode disables confirmation", async () => {
  USER_CONFIG.readonly = true;
  const view = render(RecurringIntelligence, {
    sequences: [],
    onreload: vi.fn(),
  });
  expect(await view.findByRole("button", { name: "Confirm Netflix recurring" }))
    .toBeDisabled();
});
test("row surfaces factual changes, stopped status and history", () => {
  const item = analyzeRecurring(
    "Netflix",
    history(),
    true,
    dayjs("2026-10-12"),
  )!;
  const view = render(RecurringIntelligenceRow, { item });
  expect(view.container.textContent).toContain(
    "Amount increased from 499 INR to 649 INR",
  );
  expect(view.container.textContent).toContain("Possibly stopped");
  expect(view.container.querySelector("summary")?.textContent).toContain(
    "View history",
  );
});
test("a stable upcoming row has no false amount warning", () => {
  const item = analyzeRecurring(
    "Netflix",
    history([499, 499, 499]),
    true,
    dayjs("2026-09-05"),
  )!;
  const view = render(RecurringIntelligenceRow, { item });
  expect(view.container.textContent).toContain("Expected around");
  expect(view.container.textContent).not.toContain("Amount increased");
  expect(view.container.textContent).not.toContain("Possibly stopped");
});
