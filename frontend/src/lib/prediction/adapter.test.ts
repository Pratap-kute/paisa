import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { adaptPredictAccountArgs } from "./adapter";
import { accountMatchesPrefix, unknownAccount } from "./score";

describe("predictAccount adapter", () => {
  it("joins the whole ROW when no terms are passed", () => {
    const input = adaptPredictAccountArgs([], {
      hash: { prefix: "Expenses" },
      data: { root: { ROW: { A: "Uber", B: "200", index: 3 } } },
    });
    expect(input.description).toContain("Uber");
    expect(input.prefix).toBe("Expenses");
    expect(input.rowIndex).toBe(3);
    expect(input.amount).toBeUndefined();
    expect(input.direction).toBeUndefined();
    expect(input.date).toBeUndefined();
    expect(input.commodity).toBeUndefined();
  });

  it("does not guess column semantics from spreadsheet positions", () => {
    const input = adaptPredictAccountArgs(["Starbucks"], {
      hash: { prefix: "Expenses:" },
      data: {
        root: {
          ROW: { A: "2024-01-01", B: "INR", C: "-250", D: "Assets:Checking" },
        },
      },
    });
    expect(input.description).toContain("Starbucks");
    expect(input.amount).toBeUndefined();
    expect(input.commodity).toBeUndefined();
    expect(input.sourceAccount).toBeUndefined();
    expect(input.direction).toBeUndefined();
  });

  it("uses explicit hash fields only for structured context", () => {
    const input = adaptPredictAccountArgs([{ C: "Starbucks" }, "extra"], {
      hash: {
        prefix: "Income:",
        source: "Assets:Checking",
        commodity: "INR",
        amount: "-100",
        date: "2024-02-01",
      },
    });
    expect(input.description).toBe("Starbucks extra");
    expect(input.prefix).toBe("Income:");
    expect(input.sourceAccount).toBe("Assets:Checking");
    expect(input.commodity).toBe("INR");
    expect(input.amount).toBe(-100);
    expect(input.date).toBe("2024-02-01");
    expect(input.direction).toBe("DEBIT");
  });

  it("leaves direction undefined without a source account", () => {
    const input = adaptPredictAccountArgs(["Uber"], {
      hash: { prefix: "Expenses", amount: -180 },
    });
    expect(input.amount).toBe(-180);
    expect(input.direction).toBeUndefined();
  });

  it("preserves Unknown suffix rules", () => {
    expect(unknownAccount("Expenses:")).toBe("Expenses:Unknown");
    expect(unknownAccount("Expenses")).toBe("Expenses:Unknown");
    expect(unknownAccount("")).toBe(":Unknown");
  });

  it("matches account prefixes on hierarchy boundaries", () => {
    expect(accountMatchesPrefix("Expenses", "Expenses")).toBe(true);
    expect(accountMatchesPrefix("Expenses:Food", "Expenses:")).toBe(true);
    expect(accountMatchesPrefix("Expenses:Food:Dining", "Expenses")).toBe(true);
    expect(accountMatchesPrefix("Expenses2", "Expenses")).toBe(false);
    expect(accountMatchesPrefix("ExpensesArchive", "Expenses")).toBe(false);
  });
});
