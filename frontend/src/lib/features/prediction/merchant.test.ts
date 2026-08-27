import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { buildIndex } from "./index";
import { matchPosting, similarity } from "./merchant";
import { normalizeDescription } from "./normalize";
import type { HistoryPosting } from "./types";

function posting(payee: string, account: string): HistoryPosting {
  return {
    payee,
    categoryAccount: account,
    amount: 100,
    absoluteAmount: 100,
    date: "2024-01-01",
    commodity: "INR",
    transactionId: payee + account,
  };
}

describe("merchant matching", () => {
  it("keeps amazon aliases together", () => {
    const index = buildIndex([
      posting("AMZN", "Expenses:Shopping"),
      posting("Amazon Pay", "Expenses:Shopping"),
    ]);
    expect(index.byMerchant.get("amazon")?.length).toBe(2);
  });

  it("does not collapse swiggy and instamart", () => {
    const index = buildIndex([
      posting("SWIGGY", "Expenses:Food"),
      posting("SWIGGY INSTAMART", "Expenses:Groceries"),
    ]);
    expect(index.byMerchant.get("swiggy")?.length).toBe(1);
    expect(index.byMerchant.get("swiggy instamart")?.length).toBe(1);
    const query = normalizeDescription("SWIGGY INSTAMART");
    const food = index.postings.find((row) => row.account === "Expenses:Food")!;
    const groceries = index.postings.find((row) =>
      row.account === "Expenses:Groceries"
    )!;
    expect(matchPosting(query, groceries)?.kind).toBe("EXACT_MERCHANT");
    expect(matchPosting(query, food)?.kind).toBe("SIMILARITY");
    expect(similarity(query, food.normalized)).toBeLessThan(1);
  });

  it("does not turn a single fuzzy match into a persistent alias", () => {
    const index = buildIndex([
      posting("SWIGGY", "Expenses:Food"),
    ]);
    const query = normalizeDescription("SWIGGY INSTAMART");
    expect(matchPosting(query, index.postings[0])?.kind).toBe("SIMILARITY");
    expect(
      Object.prototype.hasOwnProperty.call(index, "aliases") ||
        Object.prototype.hasOwnProperty.call(index, "ephemeralAliases"),
    ).toBe(false);
  });
});
