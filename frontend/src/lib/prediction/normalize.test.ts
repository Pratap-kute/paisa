import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { aliasKey, normalizeDescription, tokenize } from "./normalize";

describe("normalizeDescription", () => {
  const cases: Array<[string, string, string]> = [
    ["UPI/SWIGGY/123456", "swiggy", "upi swiggy 123456"],
    ["UPI-SWIGGY-INSTAMART", "swiggy instamart", "upi swiggy instamart"],
    ["Paytm/Swiggy", "swiggy", "paytm swiggy"],
    ["7 ELEVEN", "7 eleven", "7 eleven"],
    ["7-ELEVEN", "7 eleven", "7 eleven"],
    ["7ELEVEN", "7 eleven", "7 eleven"],
    ["HDFC LIFE", "hdfc life", "hdfc life"],
    ["HDFCLIFE", "hdfc life", "hdfc life"],
    ["AMAZON HTTP://WWW.AM IN", "amazon", "amazon in"],
    ["", "", ""],
    ["12345", "", "12345"],
    ["Café Swiggy", "cafe swiggy", "cafe swiggy"],
  ];

  for (const [raw, merchantKey, full] of cases) {
    it(`normalizes ${JSON.stringify(raw)}`, () => {
      const normalized = normalizeDescription(raw);
      expect(normalized.merchantKey).toBe(merchantKey);
      expect(normalized.full).toBe(full);
    });
  }

  it("tokenizes punctuation and unicode", () => {
    expect(tokenize("Hello, 世界 123")).toEqual(["hello", "123"]);
  });

  it("aliases concatenated merchant names", () => {
    expect(aliasKey(["hdfclife"])).toBe("hdfc life");
    expect(aliasKey(["amzn"])).toBe("amazon");
  });
});
