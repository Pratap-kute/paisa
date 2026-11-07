import { describe, expect, it } from "vitest";
import { preferredSource } from "./price_source";

const ledger = { commodity_type: "unknown", commodity_id: "NIFTY" };
const provider = { commodity_type: "mutualfund", commodity_id: "120716" };

describe("preferredSource", () => {
  it("prefers the provider over a newer ledger price", () => {
    expect(preferredSource([ledger, provider])).toBe(provider);
  });

  it("uses the newest provider price when there are several", () => {
    const older = { commodity_type: "mutualfund", commodity_id: "old" };
    expect(preferredSource([ledger, provider, older])).toBe(provider);
  });

  it("falls back to the ledger when no provider is configured", () => {
    const apt = { commodity_type: "unknown", commodity_id: "APT" };
    expect(preferredSource([apt])).toBe(apt);
  });
});
