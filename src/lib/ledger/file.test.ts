import { expect } from "@std/expect";
import { ensureFileExtension } from "./file.ts";

Deno.test("ensureFileExtension appends a missing extension", () => {
  expect(ensureFileExtension("expenses", ".ledger")).toBe("expenses.ledger");
});

Deno.test("ensureFileExtension preserves an existing extension", () => {
  expect(ensureFileExtension("expenses.ledger", ".ledger")).toBe(
    "expenses.ledger",
  );
  expect(ensureFileExtension("expenses.LEDGER", "ledger")).toBe(
    "expenses.LEDGER",
  );
});

Deno.test("ensureFileExtension trims surrounding whitespace", () => {
  expect(ensureFileExtension("  expenses  ", ".ledger")).toBe(
    "expenses.ledger",
  );
});
