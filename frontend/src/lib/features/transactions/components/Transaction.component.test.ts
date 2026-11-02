import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import dayjs from "dayjs";
import Transaction from "./Transaction.svelte";

test("renders a transaction payee, date, and debit/credit postings", () => {
  render(Transaction, {
    compact: false,
    t: {
      id: 1,
      date: dayjs("2022-02-07"),
      payee: "Grocery Store",
      note: "",
      postings: [
        {
          account: "Expenses:Food",
          amount: 500,
          quantity: 500,
          commodity: "INR",
          payee: "Grocery Store",
          date: dayjs("2022-02-07"),
        },
        {
          account: "Assets:Checking",
          amount: -500,
          quantity: -500,
          commodity: "INR",
          payee: "Grocery Store",
          date: dayjs("2022-02-07"),
        },
      ],
    },
  });
  expect(screen.getByText("Grocery Store")).toBeVisible();
  expect(screen.getByText("Expenses:Food")).toBeVisible();
  expect(screen.getByText("Assets:Checking")).toBeVisible();
});

test("places positive postings under debits and negative postings under credits", () => {
  const posting = (account: string, amount: number) => ({
    account,
    amount,
    quantity: amount,
    commodity: "INR",
    payee: "Grocery Store",
    date: dayjs("2022-02-07"),
  });
  const { container } = render(Transaction, {
    compact: false,
    t: {
      id: 1,
      date: dayjs("2022-02-07"),
      payee: "Grocery Store",
      note: "",
      postings: [
        posting("Expenses:Food", 500),
        posting("Assets:Checking", -500),
      ],
    },
  });
  const debit = container.querySelector(".paisa-tx-postings-debit");
  const credit = container.querySelector(".paisa-tx-postings-credit");
  expect(debit).toHaveTextContent("Expenses:Food");
  expect(debit).not.toHaveTextContent("Assets:Checking");
  expect(credit).toHaveTextContent("Assets:Checking");
  expect(credit).not.toHaveTextContent("Expenses:Food");
  expect(credit).toHaveTextContent("500.00");
  expect(credit).not.toHaveTextContent("-500");
  expect(credit).not.toHaveTextContent("−500");
});
