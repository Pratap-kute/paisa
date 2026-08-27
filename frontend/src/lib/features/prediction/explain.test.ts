import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { confidenceLabel, reasonLabel, shortReasons } from "./explain";
import { decideConfidence } from "./confidence";
import { emptyBreakdown } from "./score";
import type { ScoredAccount } from "./score";

describe("explain and confidence", () => {
  it("returns short copy without percents", () => {
    expect(confidenceLabel("HIGH")).toBe("High");
    expect(reasonLabel("EXACT_MERCHANT")).toBe("Exact merchant match");
    expect(shortReasons(["HISTORY", "HISTORY", "AMOUNT"]).join(" ")).not
      .toContain("%");
  });

  it("never treats TF-IDF as HIGH", () => {
    const top: ScoredAccount = {
      account: "Expenses:Food",
      score: 90,
      support: 5,
      reasons: ["TFIDF"],
      split: false,
      breakdown: { ...emptyBreakdown(), identity: 90, total: 90 },
    };
    expect(decideConfidence(top, 40, false, "TFIDF")).toBe("NEEDS_REVIEW");
    expect(decideConfidence(top, 40, false, "TFIDF")).not.toBe("HIGH");
    expect(decideConfidence(top, 40, false, "TFIDF")).not.toBe("MEDIUM");
  });
});
