import { test, expect } from "bun:test";
import { ensureFileExtension } from "./file";

test("ensureFileExtension appends a missing extension", () => {
  expect(ensureFileExtension("expenses", ".ledger")).toBe("expenses.ledger");
});

test("ensureFileExtension preserves an existing extension", () => {
  expect(ensureFileExtension("expenses.ledger", ".ledger")).toBe(
    "expenses.ledger",
  );
  expect(ensureFileExtension("expenses.LEDGER", "ledger")).toBe(
    "expenses.LEDGER",
  );
});

test("ensureFileExtension trims surrounding whitespace", () => {
  expect(ensureFileExtension("  expenses  ", ".ledger")).toBe(
    "expenses.ledger",
  );
});
