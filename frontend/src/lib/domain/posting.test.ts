import { describe, expect, it } from "bun:test";
import dayjs from "dayjs";
import type { Posting } from "./ledger.ts";
import { change } from "./posting.ts";

const posting = (overrides: Partial<Posting>): Posting =>
  ({
    id: "1",
    date: dayjs("2014-02-01"),
    payee: "",
    account: "Assets:Equity:PPFAS",
    commodity: "PPFAS",
    quantity: 10,
    amount: 2000,
    market_amount: 16767,
    ...overrides,
  }) as Posting;

describe("change", () => {
  it("reads the backend return instead of extrapolating one", () => {
    const c = change(
      posting({
        unrealized_gain: 14767,
        holding_days: 4656,
        annualized_return: 18.14,
      }),
    );
    expect(c.value).toBe(14767);
    expect(c.annualizedReturn).toBe(18.14);
    expect(c.days).toBe(4656);
    expect(c.class).toBe("paisa-text-success");
  });

  it("has no annualized return for a lot held under a year", () => {
    const c = change(posting({ unrealized_gain: 50, holding_days: 90 }));
    expect(c.annualizedReturn).toBeUndefined();
    expect(c.value).toBe(50);
  });

  it("marks a loss and defaults a posting without a lot to zero", () => {
    expect(
      change(posting({ unrealized_gain: -200, holding_days: 30 })).class,
    ).toBe("paisa-text-danger");
    const none = change(posting({}));
    expect(none).toEqual({
      class: "",
      value: 0,
      annualizedReturn: undefined,
      days: 0,
    });
  });
});
