import { describe, expect, it } from "bun:test";
import { resolveFinancialYear } from "./time.ts";

const available = ["2021 - 22", "2020 - 21", "2019 - 20"];

describe("resolveFinancialYear", () => {
  it("defaults an empty year to the latest available", () => {
    expect(resolveFinancialYear("", available)).toBe("2021 - 22");
  });

  it("keeps a year that is still available", () => {
    expect(resolveFinancialYear("2020 - 21", available)).toBe("2020 - 21");
  });

  it("moves a year outside the range to the latest available", () => {
    // for example the current year was chosen before the page's data arrived
    expect(resolveFinancialYear("2026 - 27", available)).toBe("2021 - 22");
  });

  it("leaves the year alone while no range is known", () => {
    expect(resolveFinancialYear("2020 - 21", [])).toBe("2020 - 21");
    expect(resolveFinancialYear("", [])).toBe("");
  });
});
