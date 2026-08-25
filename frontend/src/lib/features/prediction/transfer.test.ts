import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { detectTransfer } from "./transfer";
import { predict } from "./predict";
import { buildIndex } from "./index";
import type {
  CurrentImportContext,
  HistoryPosting,
  PredictionInput,
} from "./types";

function hist(
  payee: string,
  account: string,
  extras: Partial<HistoryPosting> = {},
): HistoryPosting {
  const amount = extras.amount ?? 5000;
  return {
    payee,
    categoryAccount: account,
    amount,
    absoluteAmount: extras.absoluteAmount ?? Math.abs(amount),
    date: extras.date ?? "2024-01-10",
    commodity: extras.commodity ?? "INR",
    transactionId: extras.transactionId ?? payee + account,
  };
}

const transferInput: PredictionInput = {
  description: "IMPS to Savings",
  amount: 5000,
  date: "2024-01-11",
  commodity: "INR",
  prefix: "Assets",
  rowIndex: 0,
};

function currentImport(
  rows: CurrentImportContext["rows"],
): CurrentImportContext {
  return { rows };
}

describe("transfer detector", () => {
  it("flags a true transfer pair in the current import", () => {
    expect(detectTransfer(
      transferInput,
      currentImport([{
        description: "IMPS from Checking",
        amount: 5000,
        date: "2024-01-10",
        commodity: "INR",
        prefix: "Assets",
        rowIndex: 1,
      }]),
    )).toBe(true);
  });

  it("ignores unrelated same amounts", () => {
    expect(detectTransfer(
      {
        ...transferInput,
        description: "Coffee",
        prefix: "Expenses",
      },
      currentImport([{
        description: "Rent",
        amount: 5000,
        date: "2024-01-10",
        commodity: "INR",
        prefix: "Expenses",
        rowIndex: 1,
      }]),
    )).toBe(false);
  });

  it("ignores many counterparts of the same amount", () => {
    expect(detectTransfer(
      transferInput,
      currentImport([
        {
          description: "Salary split",
          amount: 5000,
          prefix: "Assets",
          sourceAccount: "Assets:BankA",
          rowIndex: 1,
        },
        {
          description: "Salary split",
          amount: 5000,
          prefix: "Assets",
          sourceAccount: "Assets:BankB",
          rowIndex: 2,
        },
        {
          description: "Salary split",
          amount: 5000,
          prefix: "Assets",
          sourceAccount: "Assets:BankC",
          rowIndex: 3,
        },
      ]),
    )).toBe(false);
  });

  it("respects the date window", () => {
    expect(detectTransfer(
      transferInput,
      currentImport([{
        description: "IMPS from Checking",
        amount: 5000,
        date: "2023-01-01",
        commodity: "INR",
        prefix: "Assets",
        rowIndex: 1,
      }]),
    )).toBe(false);
  });

  it("requires matching currency", () => {
    expect(detectTransfer(
      transferInput,
      currentImport([{
        description: "IMPS from Checking",
        amount: 5000,
        date: "2024-01-10",
        commodity: "USD",
        prefix: "Assets",
        rowIndex: 1,
      }]),
    )).toBe(false);
  });

  it("never returns an Assets account under Expenses prefix", () => {
    const index = buildIndex([
      hist("Swiggy", "Expenses:Food", {
        amount: 200,
        date: "2024-01-01",
        transactionId: "s",
      }),
    ]);
    const result = predict(
      {
        description: "IMPS to Savings",
        amount: 5000,
        date: "2024-01-11",
        commodity: "INR",
        prefix: "Expenses",
        rowIndex: 0,
      },
      {},
      index,
      currentImport([{
        description: "IMPS from Checking",
        amount: 5000,
        date: "2024-01-10",
        commodity: "INR",
        prefix: "Assets",
        rowIndex: 1,
      }]),
    );
    expect(result.account.startsWith("Assets")).toBe(false);
    expect(result.possibleTransfer).toBe(true);
  });

  it("does not use committed history for transfer pairing", () => {
    const index = buildIndex([
      hist("IMPS from Checking", "Assets:Savings", { amount: 5000 }),
    ]);
    const result = predict(transferInput, {}, index, { rows: [] });
    expect(result.possibleTransfer).toBe(false);
  });
});
