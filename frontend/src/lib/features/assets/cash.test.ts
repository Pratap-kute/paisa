import { describe, expect, it } from "vitest";
import type { AssetBreakdown } from "#lib/domain/assets";
import { cashAmount, withCash } from "./cash";

function breakdown(group: string, marketAmount: number): AssetBreakdown {
  return {
    group,
    investmentAmount: 0,
    withdrawalAmount: 0,
    balanceUnits: 0,
    marketAmount,
    xirr: 0,
    gainAmount: 0,
    absoluteReturn: 0,
  };
}

const breakdowns = {
  Assets: breakdown("Assets", 2200),
  "Assets:Checking": breakdown("Assets:Checking", 1000),
  "Assets:Checking:SBI": breakdown("Assets:Checking:SBI", 1000),
  "Assets:Equity": breakdown("Assets:Equity", 1200),
  "Assets:Equity:MF": breakdown("Assets:Equity:MF", 1200),
};

describe("cashAmount", () => {
  it("counts checking inside a parent group", () => {
    expect(cashAmount("Assets", breakdowns)).toBe(1000);
  });

  it("uses the account's own balance within checking", () => {
    expect(cashAmount("Assets:Checking", breakdowns)).toBe(1000);
    expect(cashAmount("Assets:Checking:SBI", breakdowns)).toBe(1000);
  });

  it("is zero for investment groups", () => {
    expect(cashAmount("Assets:Equity", breakdowns)).toBe(0);
    expect(cashAmount("Assets:Equity:MF", breakdowns)).toBe(0);
  });

  it("is zero when there is no checking account", () => {
    const {
      "Assets:Checking": _c,
      "Assets:Checking:SBI": _s,
      ...rest
    } = breakdowns;
    expect(cashAmount("Assets", rest)).toBe(0);
  });

  it("splits a mixed group into investments plus cash", () => {
    const root = withCash(breakdowns).find((b) => b.group === "Assets")!;
    expect(root.marketAmount - root.cashAmount).toBe(1200);
  });
});
