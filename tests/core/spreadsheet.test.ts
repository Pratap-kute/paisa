import { describe, expect, test } from "vitest";
import Handlebars from "handlebars";
import * as XLSX from "xlsx";
import { asRows, parse, render } from "../../src/lib/importing/spreadsheet";

describe("spreadsheet importing", () => {
  test("parses CSV and maps columns to spreadsheet letters", async () => {
    const result = await parse(
      new File(["date,amount\n2024-01-01,42\n"], "x.CSV"),
    );
    expect(result.data).toEqual([
      ["date", "amount"],
      ["2024-01-01", "42"],
    ]);
    expect(asRows(result)).toEqual([
      { A: "date", B: "amount", index: 0 },
      { A: "2024-01-01", B: "42", index: 1 },
    ]);
  });

  test("parses a workbook", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["name", "amount"], ["Rent", 100]]),
      "Sheet1",
    );
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const result = await parse(new File([bytes], "fixture.xlsx"));
    expect(result.data).toEqual([["name", "amount"], ["Rent", "100"]]);
  });

  test("rejects unsupported extensions", () => {
    expect(() => parse(new File([], "statement.json"))).toThrow(
      "Unsupported file type json",
    );
  });

  test("renders, filters, trims, and reverses rows", () => {
    const rows = asRows({ data: [["one"], [""], ["two"]] });
    const template = Handlebars.compile(" {{ROW.A}} ");
    expect(render(rows, template)).toBe(" one    two ");
    expect(render(rows, template, { trim: true, reverse: true })).toBe(
      "two\n\none",
    );
  });
});
