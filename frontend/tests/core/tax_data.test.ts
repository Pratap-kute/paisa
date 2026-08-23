import { describe, expect, it } from "vitest";
import {
  filterHarvestables,
  harvestablePercentage,
  unitsRequiredFromAmount,
  unitsRequiredFromGain,
} from "$lib/charts/harvest_data";
import { scheduleALTotal } from "$lib/charts/schedule_al_data";
import type { Harvestable, ScheduleALEntry } from "$lib/core/utils";

function harvestable(overrides: Partial<Harvestable> = {}): Harvestable {
  return {
    account: "Assets:Fund",
    tax_category: "long_term",
    total_units: 20,
    harvestable_units: 15,
    unrealized_gain: -300,
    taxable_unrealized_gain: -200,
    current_unit_price: 100,
    current_unit_date: "2022-02-07",
    harvest_breakdown: [
      {
        units: 10,
        purchase_date: "2020-01-01",
        purchase_price: 800,
        purchase_unit_price: 80,
        current_price: 1000,
        tax: { gain: 200, taxable: 200, short_term: 0, long_term: 20, slab: 0 },
      },
      {
        units: 5,
        purchase_date: "2021-01-01",
        purchase_price: 450,
        purchase_unit_price: 90,
        current_price: 500,
        tax: { gain: 50, taxable: 50, short_term: 0, long_term: 5, slab: 0 },
      },
    ],
    ...overrides,
  };
}

describe("Tax Harvest calculations", () => {
  it("keeps only positive harvest opportunities in source order", () => {
    const first = harvestable({ account: "First" });
    const unavailable = harvestable({
      account: "Hidden",
      harvestable_units: 0,
    });
    const last = harvestable({ account: "Last" });
    expect(
      filterHarvestables([first, unavailable, last]).map((item) =>
        item.account
      ),
    )
      .toEqual(["First", "Last"]);
  });

  it("calculates units and amount from taxable gain without mutating breakdowns", () => {
    const value = harvestable();
    const original = structuredClone(value.harvest_breakdown);
    expect(unitsRequiredFromGain(value, 225)).toEqual([12.5, 1250, 225]);
    expect(value.harvest_breakdown).toEqual(original);
  });

  it("calculates units and taxable gain from redemption amount", () => {
    expect(unitsRequiredFromAmount(harvestable(), 1250)).toEqual([
      12.5,
      1250,
      225,
    ]);
    expect(unitsRequiredFromAmount(harvestable(), 0)).toEqual([0, 0, 0]);
  });

  it("reports stable percentages for partial, overflow, and zero totals", () => {
    expect(harvestablePercentage(harvestable())).toBe(75);
    expect(harvestablePercentage(harvestable({ harvestable_units: 25 }))).toBe(
      125,
    );
    expect(harvestablePercentage(harvestable({ total_units: 0 }))).toBe(0);
  });
});

describe("Schedule AL calculations", () => {
  it("sums entries without changing their order", () => {
    const entries: ScheduleALEntry[] = [
      {
        section: { code: "A", section: "1", details: "House" },
        amount: 500000,
      },
      {
        section: { code: "B", section: "2", details: "Vehicle" },
        amount: -25000,
      },
    ];
    expect(scheduleALTotal(entries)).toBe(475000);
    expect(entries.map((entry) => entry.section.code)).toEqual(["A", "B"]);
    expect(scheduleALTotal([])).toBe(0);
  });
});
