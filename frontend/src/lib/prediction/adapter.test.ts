import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { adaptPredictAccountArgs } from "./adapter";
import { accountMatchesPrefix, unknownAccount } from "./score";

describe("predictAccount adapter", () => {
  it("uses longer non-numeric ROW cells when no terms are passed", () => {
    const input = adaptPredictAccountArgs([], {
      hash: { prefix: "Expenses" },
      data: { root: { ROW: { A: "Uber", B: "200", index: 3 } } },
    });
    expect(input.description).toBe("Uber");
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
    expect(input.description).toBe("Starbucks");
    expect(input.amount).toBeUndefined();
    expect(input.commodity).toBeUndefined();
    expect(input.sourceAccount).toBeUndefined();
    expect(input.direction).toBeUndefined();
  });

  it("extracts SBI-style narration from a mixed ROW without terms", () => {
    const input = adaptPredictAccountArgs([], {
      hash: {},
      data: {
        root: {
          ROW: {
            A: "01/04/2026",
            B: "WDL TFR UPI/309191771120/AMAZON SELLER SERVICES",
            C: "",
            D: "200.00",
            E: "",
            F: "49487.44",
            index: 19,
          },
        },
      },
    });
    expect(input.description).toContain("AMAZON SELLER");
    expect(input.description).not.toContain("200.00");
    expect(input.description).not.toContain("01/04/2026");
    expect(input.prefix).toBe("");
    expect(input.rowIndex).toBe(19);
  });

  it("joins wrapped spreadsheet narration into one description", () => {
    const input = adaptPredictAccountArgs([
      "DEP TFR   NEFT*HDFC0000240*HDFCH00902314455*AC\nME VENDOR*BAT   0099509044300 AT 01307",
    ], { hash: { prefix: "Income" } });
    expect(input.description).toContain("ACME VENDOR");
    expect(input.description).not.toContain("AC ME");
    expect(input.description).not.toContain("\n");
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
    expect(unknownAccount("")).toBe("Unknown");
    expect(unknownAccount("   ")).toBe("Unknown");
  });

  it("matches account prefixes on hierarchy boundaries", () => {
    expect(accountMatchesPrefix("Expenses", "Expenses")).toBe(true);
    expect(accountMatchesPrefix("Expenses:Food", "Expenses:")).toBe(true);
    expect(accountMatchesPrefix("Expenses:Food:Dining", "Expenses")).toBe(true);
    expect(accountMatchesPrefix("Expenses2", "Expenses")).toBe(false);
    expect(accountMatchesPrefix("ExpensesArchive", "Expenses")).toBe(false);
  });
});
