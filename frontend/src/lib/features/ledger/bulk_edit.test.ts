import { describe, test, expect } from "bun:test";
import fs from "node:fs";

import { applyChanges } from "./bulk_edit";
import type { LedgerFile, Transaction } from "#lib/domain/ledger";
import { trim } from "es-toolkit";
function fixturePath(path: string): string {
  try {
    if (fs.existsSync(`../fixture/${path}`)) {
      return `../fixture/${path}`;
    }
    return `fixture/${path}`;
  } catch (_) {
    return `fixture/${path}`;
  }
}

describe("bulk_editor", () => {
  const before = fs.readFileSync(fixturePath("main.ledger"), "utf-8");
  const transactions = JSON.parse(
    fs.readFileSync(fixturePath("main.transactions.json"), "utf-8"),
  );
  Array.from(
    fs.readdirSync(fixturePath("bulk_edit"), { withFileTypes: true }),
  ).forEach((entry) => {
    const dir = entry.name;
    test(dir, () => {
      const files = Array.from(
        fs.readdirSync(fixturePath(`bulk_edit/${dir}`), {
          withFileTypes: true,
        }),
        ({ name }) => name,
      );
      for (const file of files) {
        const [name, extension] = file.split(".");
        if (extension === "ledger") {
          const args = JSON.parse(
            fs.readFileSync(
              fixturePath(`bulk_edit/${dir}/${name}.json`),
              "utf-8",
            ),
          );
          const after = fs.readFileSync(
            fixturePath(`bulk_edit/${dir}/${name}.ledger`),
            "utf-8",
          );
          const ledgerFile: LedgerFile = {
            type: "file",
            name: "main.ledger",
            content: before,
            versions: [],
          };
          const {
            newFiles: [newLedgerFile],
          } = applyChanges([ledgerFile], transactions, dir, args);
          expect(trim(newLedgerFile.content)).toBe(trim(after.toString()));
        }
      }
    });
  });

  test("rename * posting preserves status and changes account", () => {
    const content = `2026/01/01 Lunch\n    * Expenses:Food                               20 INR\n    Assets:Checking                              -20 INR`;
    const file: LedgerFile = {
      type: "file",
      name: "main.ledger",
      content,
      versions: [],
    };
    const txs = [
      {
        id: "status-cleared",
        date: undefined,
        payee: "Lunch",
        fileName: "main.ledger",
        beginLine: 1,
        endLine: 3,
        postings: [
          { account: "Expenses:Food" },
          { account: "Assets:Checking" },
        ],
      },
    ] as unknown as Transaction[];
    const {
      newFiles: [res],
    } = applyChanges([file], txs, "rename_account", {
      oldAccountName: "Expenses:Food",
      newAccountName: "Expenses:Dining",
    });
    expect(res.content).toContain("* Expenses:Dining");
  });

  test("rename ! posting preserves status and changes account", () => {
    const content = `2026/01/01 Lunch\n    ! Expenses:Food                               20 INR\n    Assets:Checking                              -20 INR`;
    const file: LedgerFile = {
      type: "file",
      name: "main.ledger",
      content,
      versions: [],
    };
    const txs = [
      {
        id: "status-pending",
        date: undefined,
        payee: "Lunch",
        fileName: "main.ledger",
        beginLine: 1,
        endLine: 3,
        postings: [
          { account: "Expenses:Food" },
          { account: "Assets:Checking" },
        ],
      },
    ] as unknown as Transaction[];
    const {
      newFiles: [res],
    } = applyChanges([file], txs, "rename_account", {
      oldAccountName: "Expenses:Food",
      newAccountName: "Expenses:Dining",
    });
    expect(res.content).toContain("! Expenses:Dining");
  });
});
