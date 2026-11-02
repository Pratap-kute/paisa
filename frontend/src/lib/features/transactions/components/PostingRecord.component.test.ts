import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import dayjs from "dayjs";
import PostingRecord from "./PostingRecord.svelte";
import type { Posting } from "$lib/domain/ledger";

const posting = (overrides: Partial<Posting>): Posting =>
  ({
    account: "Expenses:Food",
    amount: -500,
    quantity: -500,
    commodity: USER_CONFIG.default_currency,
    payee: "Grocery Store",
    date: dayjs("2022-02-07"),
    balance: 1250,
    market_amount: 0,
    ...overrides,
  }) as Posting;

test("renders date, signed amount, payee, account and balance", () => {
  render(PostingRecord, { posting: posting({}) });
  expect(screen.getByText("07 Feb 2022")).toBeVisible();
  expect(screen.getByText("Grocery Store")).toBeVisible();
  expect(screen.getByText(/Expenses:Food/)).toBeVisible();
  expect(screen.getByText(/-500\.00|−500\.00/)).toBeVisible();
  expect(screen.getByText(/1,250\.00/)).toBeVisible();
});

test("shows units and unit price only for commodity postings", () => {
  const { unmount } = render(PostingRecord, { posting: posting({}) });
  expect(screen.queryByText(/@/)).toBeNull();
  unmount();

  render(PostingRecord, {
    posting: posting({
      account: "Assets:Equity:NIFTY",
      commodity: "NIFTY",
      amount: 1000,
      quantity: 10,
    }),
  });
  expect(screen.getByText(/10\.0000 @ 100\.0000/)).toBeVisible();
});
