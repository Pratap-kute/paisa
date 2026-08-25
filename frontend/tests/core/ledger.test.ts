import { describe, expect, test } from "vitest";
import { applyChanges } from "$lib/features/ledger/bulk_edit";
import { ensureFileExtension } from "$lib/features/ledger/file";
import { format } from "$lib/features/ledger/journal";

describe("ledger helpers", () => {
  test("normalizes file extensions", () => {
    expect(ensureFileExtension(" journal ", ".ledger")).toBe("journal.ledger");
    expect(ensureFileExtension("journal.LEDGER", "ledger")).toBe(
      "journal.LEDGER",
    );
  });

  test("formats transaction postings and preserves other lines", () => {
    USER_CONFIG.amount_alignment_column = 30;
    expect(format("2024-01-01 Rent\n  Expenses:Rent  INR 100\n  Assets:Cash"))
      .toBe("2024-01-01 Rent\n    Expenses:Rent      INR 100\n    Assets:Cash");
    expect(format("; comment\nplain text")).toBe("; comment\nplain text");
  });

  test("renames matching transaction accounts only", () => {
    const files = [{
      type: "file",
      name: "main.ledger",
      versions: [],
      content: "2024-01-01 Rent\n  Expenses:Rent  INR 100\n  Assets:Cash\n",
    }];
    const transactions = [{
      fileName: "main.ledger",
      beginLine: 1,
      endLine: 3,
      postings: [{ account: "Expenses:Rent" }],
    }];
    const result = applyChanges(
      files as never,
      transactions as never,
      "rename_account",
      {
        oldAccountName: "Expenses:Rent",
        newAccountName: "Expenses:Housing",
      },
    );
    expect(result.updatedTransactionsCount).toBe(1);
    expect(result.newFiles[0].content).toContain("Expenses:Housing");
    const unchanged = applyChanges(
      files as never,
      transactions as never,
      "rename_account",
      {
        oldAccountName: "Expenses:Food",
        newAccountName: "Expenses:Dining",
      },
    );
    expect(unchanged.updatedTransactionsCount).toBe(0);
  });
});
