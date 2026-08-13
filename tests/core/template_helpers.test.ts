import { describe, expect, test } from "vitest";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import helpers from "../../src/lib/importing/template_helpers";

dayjs.extend(customParseFormat);

const options = (hash: Record<string, unknown> = {}, root: object = {}) => ({
  hash,
  data: { root },
});

describe("template helpers", () => {
  test.each(
    [
      ["eq", [1, 1], true],
      ["eq", [1, "1"], false],
      ["ne", [1, 2], true],
      ["not", [0], true],
      ["gte", ["₹1,200.50", 1200], true],
      ["gt", ["(25.5)", -30], true],
      ["lte", ["bad", 1], false],
      ["lt", [1, 2], true],
    ] as const,
  )("%s(%j)", (name, args, expected) => {
    expect((helpers[name] as (...values: unknown[]) => unknown)(...args))
      .toBe(expected);
  });

  test("normalizes and rounds amounts", () => {
    expect(helpers.negate("₹1,234.50")).toBe(-1234.5);
    expect(helpers.round("12.345", options({ precision: 2 }))).toBe(12.35);
    expect(helpers.amount(" (₹1,200.50) ", options())).toBe("-1200.50");
    expect(helpers.amount("n/a", options({ default: "0" }))).toBe("0");
  });

  test("handles booleans and blank values", () => {
    expect(helpers.and(true, 1, options())).toBe(true);
    expect(helpers.and(true, 0, options())).toBe(false);
    expect(helpers.or(false, "yes", options())).toBe("yes");
    expect(helpers.or(false, 0, options())).toBeUndefined();
    expect(helpers.isBlank("   ")).toBe(true);
    expect(helpers.isBlank("value")).toBe(false);
  });

  test("validates, formats, and transforms text and dates", () => {
    expect(helpers.isDate("31/12/2023", "DD/MM/YYYY")).toBe(true);
    expect(helpers.isDate("31/13/2023", "DD/MM/YYYY")).toBe(false);
    expect(helpers.isDate(42 as unknown as string, "YYYY")).toBe(false);
    expect(helpers.date(" 2023-02-07 ", "YYYY-MM-DD")).toBe("2023/02/07");
    expect(helpers.trim(" value ")).toBe("value");
    expect(helpers.replace("a-b-a", "a", "x")).toBe("x-b-x");
    expect(helpers.replace(2 as unknown as string, "2", "x")).toBeUndefined();
    expect(helpers.acronym("The Axis Growth Direct Plan")).toBe("A");
    expect(helpers.toLowerCase("AbC")).toBe("abc");
    expect(helpers.toUpperCase("AbC")).toBe("ABC");
    expect(helpers.capitalize("hELLO WORLD")).toBe("Hello world");
  });

  test("extracts ranges and regular-expression matches", () => {
    const root = { ROW: { A: "one", B: "two", C: "three" } };
    expect(helpers.textRange("A", "C", options({ separator: "," }, root)))
      .toBe("one,two,three");
    expect(helpers.regexpTest("INV-123", "^INV-\\d+$")).toBe(true);
    expect(helpers.regexpTest(1 as unknown as string, ".")).toBeUndefined();
    expect(helpers.regexpMatch("INV-123", "INV-(\\d+)", options({ group: 1 })))
      .toBe("123");
    expect(helpers.regexpMatch("none", "(\\d+)", options())).toBeUndefined();
    expect(
      helpers.match("coffee shop", options({ Food: "coffee", Taxi: "cab" })),
    )
      .toBe("Food");
    expect(helpers.match("unknown", options({ Food: "coffee" }))).toBeNull();
  });

  test("searches adjacent spreadsheet rows", () => {
    const sheet = [
      { A: "header", index: 0 },
      { A: "", index: 1 },
      { A: "value 42", index: 2 },
      { A: "tail", index: 3 },
    ];
    expect(helpers.findAbove("A", options({}, { ROW: sheet[2], SHEET: sheet })))
      .toBe("header");
    expect(
      helpers.findAbove(
        "A",
        options({ regexp: "(value) (\\d+)", group: 2 }, {
          ROW: sheet[3],
          SHEET: sheet,
        }),
      ),
    ).toBe("42");
    expect(helpers.findBelow("A", options({}, { ROW: sheet[1], SHEET: sheet })))
      .toBe("value 42");
    expect(helpers.findBelow("B", options({}, { ROW: sheet[3], SHEET: sheet })))
      .toBeNull();
  });

  test("falls back to an unknown predicted account", () => {
    expect(helpers.predictAccount("merchant", options({ prefix: "Expenses:" })))
      .toBe("Expenses:Unknown");
    expect(helpers.predictAccount(options({ prefix: "Expenses" }, {
      ROW: { A: "merchant" },
    }))).toBe("Expenses:Unknown");
  });
});
