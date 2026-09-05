import "dayjs/plugin/isSameOrBefore.js";
import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import dayjs from "dayjs";
import type { Transaction } from "$lib/domain/ledger";
import { tagRecurringContent } from "./recurring_confirmation";
const content =
  "2026/06/08 Netflix\n    Expenses:Entertainment  499 INR\n    Assets:Bank\n\n2026/07/08 Netflix\n    Expenses:Entertainment  499 INR\n    Assets:Bank\n";
function transaction(beginLine = 1, endLine = 3): Transaction {
  return {
    id: String(beginLine),
    payee: "Netflix",
    date: dayjs(beginLine === 1 ? "2026-06-08" : "2026-07-08"),
    beginLine,
    endLine,
    fileName: "main.ledger",
    postings: [{ account: "Expenses:Entertainment" }, {
      account: "Assets:Bank",
    }],
  } as Transaction;
}
describe("recurring ledger metadata edits", () => {
  it("tags multiple transactions from bottom to top without reformatting", () => {
    const result = tagRecurringContent(
      content,
      [transaction(), transaction(5, 7)],
      "Netflix",
      "ledger",
    );
    expect(result.split("    ; Recurring: Netflix\n").join("")).toBe(content);
    expect(result.match(/Recurring:/g)).toHaveLength(2);
  });
  it("preserves CRLF and supports hledger and Beancount metadata", () => {
    expect(
      tagRecurringContent(
        content.replaceAll("\n", "\r\n"),
        [transaction()],
        "Netflix",
        "hledger",
      ),
    ).toContain("\r\n    ; Recurring: Netflix\r\n");
    expect(
      tagRecurringContent(
        content.replaceAll("/", "-").replaceAll(" Netflix", ' * "Netflix"'),
        [transaction()],
        "Netflix",
        "beancount",
      ),
    ).toContain('  recurring: "Netflix"');
  });
  it("rejects stale transaction locations and existing metadata", () => {
    expect(() =>
      tagRecurringContent(
        content.replace("Netflix", "Other"),
        [transaction()],
        "Netflix",
        "ledger",
      )
    ).toThrow();
    expect(() =>
      tagRecurringContent(
        content.replace("Expenses:Entertainment", "Expenses:Food"),
        [transaction()],
        "Netflix",
        "ledger",
      )
    ).toThrow();
    const tagged = tagRecurringContent(
      content,
      [transaction()],
      "Netflix",
      "ledger",
    );
    expect(() =>
      tagRecurringContent(tagged, [transaction(1, 4)], "Netflix", "ledger")
    ).toThrow();
    expect(() =>
      tagRecurringContent(content, [transaction()], "bad\nidentity", "ledger")
    ).toThrow();
  });
});

it("reports partial saves and sync failures without claiming durable completion", async () => {
  const { api } = await import("$lib/api");
  const { saveRecurringConfirmation } = await import(
    "./recurring_confirmation"
  );
  const originalSave = api.editor.saveEditorFile;
  let calls = 0;
  const edits = ["one.ledger", "two.ledger"].map((name) => ({
    name,
    content: "tagged",
    expected_content: "original",
  }));
  try {
    api.editor.saveEditorFile = () =>
      Promise.resolve(
        ++calls === 1
          ? { saved: true, synced: true }
          : { saved: false, synced: false, message: "Write failed" },
      );
    await expect(saveRecurringConfirmation(edits)).rejects.toThrow(
      "1 of 2 files saved",
    );
    api.editor.saveEditorFile = () =>
      Promise.resolve({
        saved: true,
        synced: false,
        message: "Sync failed",
      });
    await expect(saveRecurringConfirmation(edits)).rejects.toThrow(
      "Sync failed",
    );
  } finally {
    api.editor.saveEditorFile = originalSave;
  }
});

it("matches Beancount's combined payee and narration representation", () => {
  const t = transaction();
  t.payee = "Netflix | Subscription";
  const bean = content.replaceAll("/", "-").replaceAll(
    " Netflix",
    ' * "Netflix" "Subscription"',
  );
  expect(tagRecurringContent(bean, [t], "Netflix", "beancount")).toContain(
    '  recurring: "Netflix"',
  );
});
