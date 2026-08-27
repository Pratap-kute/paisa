import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { buildIndex } from "./index";
import { predict } from "./predict";
import { predictionSession } from "./session";
import type { HistoryPosting, PredictionInput } from "./types";

function hist(
  payee: string,
  account: string,
  extras: Partial<HistoryPosting> = {},
): HistoryPosting {
  const amount = extras.amount ?? 250;
  return {
    payee,
    categoryAccount: account,
    amount,
    absoluteAmount: extras.absoluteAmount ?? Math.abs(amount),
    date: extras.date ?? "2024-01-01",
    commodity: extras.commodity ?? "INR",
    transactionId: extras.transactionId ??
      `${payee}-${account}-${extras.date ?? "2024-01-01"}`,
    sourceAccount: extras.sourceAccount,
    direction: extras.direction,
  };
}

function input(
  description: string,
  extras: Partial<PredictionInput> = {},
): PredictionInput {
  return {
    description,
    prefix: extras.prefix ?? "Expenses",
    amount: "amount" in extras ? extras.amount : 250,
    date: "date" in extras ? extras.date : "2024-06-01",
    commodity: "commodity" in extras ? extras.commodity : "INR",
    sourceAccount: extras.sourceAccount,
    direction: extras.direction,
    rowIndex: extras.rowIndex,
    helperInvocationIndex: extras.helperInvocationIndex,
  };
}

describe("account scoring", () => {
  it("predicts HIGH for a majority merchant", () => {
    const index = buildIndex(
      Array.from(
        { length: 6 },
        (_, i) =>
          hist("Starbucks Coffee", "Expenses:Food", {
            date: `2024-01-0${i + 1}`,
          }),
      ),
    );
    const result = predict(input("STARBUCKS COFFEE"), {}, index);
    expect(result.account).toBe("Expenses:Food");
    expect(result.confidence).toBe("HIGH");
    expect(result.source).toBe("HISTORY");
  });

  it("does not assign HIGH when history is 8 vs 7", () => {
    const history = [
      ...Array.from(
        { length: 8 },
        (_, i) =>
          hist("Local Store", "Expenses:Food", {
            date: `2024-01-${String(i + 1).padStart(2, "0")}`,
          }),
      ),
      ...Array.from(
        { length: 7 },
        (_, i) =>
          hist("Local Store", "Expenses:Groceries", {
            date: `2024-02-${String(i + 1).padStart(2, "0")}`,
          }),
      ),
    ];
    const result = predict(input("Local Store"), {}, buildIndex(history));
    expect(result.confidence).not.toBe("HIGH");
    expect(
      result.reasons.includes("SPLIT") || result.confidence === "NEEDS_REVIEW",
    ).toBe(true);
  });

  it("returns Unknown for a new merchant", () => {
    const index = buildIndex([hist("Starbucks", "Expenses:Food")]);
    const result = predict(input("Brand New Cafe XYZ"), {}, index);
    expect(result.account).toBe("Expenses:Unknown");
    expect(result.confidence).toBe("UNKNOWN");
  });

  it("hard-filters by prefix hierarchy boundaries", () => {
    const index = buildIndex([
      hist("Acme Payroll", "Income:Salary"),
      hist("Acme Payroll", "Expenses:Payroll"),
      hist("Acme Payroll", "Expenses2:Other"),
      hist("Acme Payroll", "ExpensesArchive:Old"),
    ]);
    const income = predict(
      input("Acme Payroll", { prefix: "Income" }),
      {},
      index,
    );
    const expenses = predict(
      input("Acme Payroll", { prefix: "Expenses" }),
      {},
      index,
    );
    const assets = predict(
      input("Acme Payroll", { prefix: "Assets" }),
      {},
      index,
    );
    expect(income.account).toBe("Income:Salary");
    expect(expenses.account).toBe("Expenses:Payroll");
    expect(assets.account).toBe("Assets:Unknown");
    expect(
      predict(input("Acme Payroll", { prefix: "Expenses" }), {}, index)
        .account,
    ).not.toBe("Expenses2:Other");
    expect(
      predict(input("Acme Payroll", { prefix: "Expenses" }), {}, index)
        .account,
    ).not.toBe("ExpensesArchive:Old");
  });

  it("scores direction only relative to a defined source account", () => {
    const index = buildIndex([
      hist("Uber", "Expenses:Travel", {
        amount: -200,
        absoluteAmount: 200,
        sourceAccount: "Assets:Checking",
        direction: "DEBIT",
      }),
    ]);
    const same = predict(
      input("Uber", {
        amount: -180,
        sourceAccount: "Assets:Checking",
        direction: "DEBIT",
      }),
      {},
      index,
    );
    const opposite = predict(
      input("Uber", {
        amount: 180,
        sourceAccount: "Assets:Checking",
        direction: "CREDIT",
      }),
      {},
      index,
    );
    expect(same.breakdown.direction).toBeGreaterThan(
      opposite.breakdown.direction,
    );
    const unsigned = predict(input("Uber", { amount: -180 }), {}, index);
    expect(unsigned.breakdown.direction).toBe(0);
  });

  it("does not treat missing currency as a mismatch", () => {
    const index = buildIndex([
      hist("Uber", "Expenses:Travel", { commodity: "USD" }),
    ]);
    const same = predict(input("Uber", { commodity: "USD" }), {}, index);
    const mismatch = predict(input("Uber", { commodity: "INR" }), {}, index);
    const missing = predict(
      input("Uber", { commodity: undefined }),
      {},
      index,
    );
    expect(same.score).toBeGreaterThan(mismatch.score);
    expect(mismatch.breakdown.currency).toBeLessThan(0);
    expect(missing.breakdown.currency).toBe(0);
    const missingAmount = predict(
      input("Uber", { amount: undefined }),
      {},
      index,
    );
    expect(missingAmount.breakdown.amount).toBe(0);
    expect(missingAmount.breakdown.direction).toBe(0);
  });

  it("compares amount magnitude with absolute values", () => {
    const index = buildIndex([
      hist("Netflix", "Expenses:Entertainment", {
        amount: -199,
        absoluteAmount: 199,
      }),
      hist("Netflix", "Expenses:Entertainment", {
        amount: 199,
        date: "2024-02-01",
        transactionId: "n2",
      }),
    ]);
    const result = predict(input("Netflix", { amount: -199 }), {}, index);
    expect(result.account).toBe("Expenses:Entertainment");
    expect(result.breakdown.amount).toBeGreaterThan(0);
    const varied = predict(input("Netflix", { amount: 799 }), {}, index);
    expect(varied.breakdown.amount).toBeLessThan(result.breakdown.amount);
  });

  it("breaks ties deterministically", () => {
    const index = buildIndex([
      hist("Twin", "Expenses:Zoo"),
      hist("Twin", "Expenses:Apple"),
    ]);
    const first = predict(input("Twin"), {}, index);
    const second = predict(input("Twin"), {}, index);
    expect(first.account).toBe(second.account);
    expect(first.account).toBe("Expenses:Apple");
  });
});

describe("self-reinforcement and overrides", () => {
  beforeEach(() => {
    predictionSession.reset();
  });

  it("does not let preview Food boost a later row", () => {
    predictionSession.loadHistory([
      hist("UniqueCafe", "Expenses:Food"),
    ]);
    const first = predictionSession.predictInput(
      input("UniqueCafe", { rowIndex: 0 }),
    );
    expect(first.account).toBe("Expenses:Food");
    const indexSize = predictionSession.index?.postings.length;
    const second = predictionSession.predictInput(
      input("UniqueCafe", { rowIndex: 1 }),
    );
    expect(predictionSession.index?.postings.length).toBe(indexSize);
    expect(second.support).toBe(first.support);
  });

  it("keeps a manual override across re-render", () => {
    predictionSession.loadHistory([hist("Uber", "Expenses:Travel")]);
    predictionSession.predictInput(
      input("Uber", { rowIndex: 4, prefix: "Expenses" }),
    );
    predictionSession.setOverride(4, "Expenses", "Expenses:Taxi");
    const again = predictionSession.predictInput(
      input("Uber", { rowIndex: 4, prefix: "Expenses" }),
    );
    expect(again.account).toBe("Expenses:Taxi");
    expect(again.source).toBe("USER");
  });

  it("learns from a committed correction on the next import", () => {
    const before = predict(
      input("Corner Bakery"),
      {},
      buildIndex([hist("Corner Bakery", "Expenses:Unknown")]),
    );
    expect(
      before.confidence === "UNKNOWN" || before.account.endsWith("Unknown"),
    ).toBe(true);
    const after = predict(
      input("Corner Bakery"),
      {},
      buildIndex([
        hist("Corner Bakery", "Expenses:Food"),
        hist("Corner Bakery", "Expenses:Food", {
          date: "2024-03-01",
          transactionId: "c2",
        }),
      ]),
    );
    expect(after.account).toBe("Expenses:Food");
  });

  it("applies merchant rules only when the account matches the prefix", () => {
    const index = buildIndex([]);
    const matched = predict(
      input("Swiggy Instamart"),
      {
        merchantRules: [{
          merchant: "swiggy instamart",
          account: "Expenses:Groceries",
        }],
      },
      index,
    );
    expect(matched.account).toBe("Expenses:Groceries");
    expect(matched.source).toBe("RULE");
    const skipped = predict(
      input("Swiggy Instamart", { prefix: "Income" }),
      {
        merchantRules: [{
          merchant: "swiggy instamart",
          account: "Expenses:Groceries",
        }],
      },
      index,
    );
    expect(skipped.account).toBe("Income:Unknown");
  });

  it("supports grouped merchants array syntax and matches every listed merchant", () => {
    const index = buildIndex([]);
    const rules = [
      {
        account: "Expenses:Groceries",
        merchants: [
          "supermarket central",
          "fresh mart",
          "corner grocery",
          "quick commerce",
        ],
      },
      {
        account: "Expenses:Groceries:Vegetable",
        merchants: [
          "green farm market",
          "city produce",
          "fresh vegetables",
        ],
      },
    ];

    for (const merchant of ["supermarket central", "FRESH MART", "Corner Grocery", "quick commerce"]) {
      const res = predict(input(merchant), { merchantRules: rules }, index);
      expect(res.account).toBe("Expenses:Groceries");
      expect(res.source).toBe("RULE");
      expect(res.confidence).toBe("HIGH");
    }

    for (const merchant of ["green farm market", "City Produce", "Fresh Vegetables"]) {
      const res = predict(input(merchant), { merchantRules: rules }, index);
      expect(res.account).toBe("Expenses:Groceries:Vegetable");
      expect(res.source).toBe("RULE");
      expect(res.confidence).toBe("HIGH");
    }
  });

  it("supports mixed singular and grouped rules in the same configuration", () => {
    const index = buildIndex([]);
    const rules = [
      {
        merchant: "transit express",
        account: "Expenses:Transport",
      },
      {
        account: "Expenses:Groceries",
        merchants: ["supermarket central", "corner grocery"],
      },
    ];

    const uberRes = predict(input("UPI/TRANSIT EXPRESS/123456"), { merchantRules: rules }, index);
    expect(uberRes.account).toBe("Expenses:Transport");
    expect(uberRes.source).toBe("RULE");

    const blinkitRes = predict(input("Supermarket Central"), { merchantRules: rules }, index);
    expect(blinkitRes.account).toBe("Expenses:Groceries");
    expect(blinkitRes.source).toBe("RULE");

    const kanhaRes = predict(input("Corner Grocery"), { merchantRules: rules }, index);
    expect(kanhaRes.account).toBe("Expenses:Groceries");
    expect(kanhaRes.source).toBe("RULE");
  });

  it("is behaviorally equivalent between 1 grouped rule and N singular rules", () => {
    const merchants = ["supermarket central", "fresh mart", "corner grocery", "quick commerce"];
    const groupedRules = [
      {
        account: "Expenses:Groceries",
        merchants,
      },
    ];
    const singularRules = merchants.map((m) => ({
      merchant: m,
      account: "Expenses:Groceries",
    }));

    const index = buildIndex([]);
    for (const m of merchants) {
      const groupedResult = predict(input(m), { merchantRules: groupedRules }, index);
      const singularResult = predict(input(m), { merchantRules: singularRules }, index);

      expect(groupedResult.account).toBe(singularResult.account);
      expect(groupedResult.score).toBe(singularResult.score);
      expect(groupedResult.source).toBe(singularResult.source);
      expect(groupedResult.confidence).toBe(singularResult.confidence);
      expect(groupedResult.reasons).toEqual(singularResult.reasons);
    }
  });

  it("falls back to history / prediction index when merchant does not match any rule", () => {
    const index = buildIndex(
      Array.from({ length: 6 }, (_, i) =>
        hist("Coffee Roasters", "Expenses:Dining", {
          date: `2024-01-0${i + 1}`,
        }),
      ),
    );
    const rules = [
      {
        account: "Expenses:Groceries",
        merchants: ["supermarket central", "corner grocery"],
      },
    ];

    const res = predict(input("COFFEE ROASTERS"), { merchantRules: rules }, index);
    expect(res.account).toBe("Expenses:Dining");
    expect(res.source).toBe("HISTORY");
  });
});

