import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { aliasKey, normalizeDescription, tokenize } from "./normalize";

describe("normalizeDescription", () => {
  const cases: Array<[string, string, string]> = [
    ["UPI/SWIGGY/123456", "swiggy", "upi swiggy 123456"],
    [
      "WDL TFR UPI/309191771120/AMAZON SELLER SERVICES",
      "amazon",
      "wdl tfr upi 309191771120 amazon seller services",
    ],
    [
      "WDL TFR   UPI/DR/882090110936/Google P/utib/playstore1",
      "google",
      "wdl tfr upi dr 882090110936 google p utib playstore 1",
    ],
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
    [
      "DEP TFR   NEFT*HDFC0000240*HDFCH00902314455*AC\nME VENDOR*BAT   0099509044300 AT 01307",
      "acme vendor",
      "dep tfr neft hdfc 0000240 hdfch 00902314455 acme vendor bat 0099509044300 at 01307",
    ],
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
