import { describe, it as test } from "@std/testing/bdd";
import { expect } from "@std/expect";

import { applyChanges } from "./bulk_edit";
import type { LedgerFile } from "$lib/core/utils";
import { trim } from "es-toolkit";
function fixturePath(path: string): string {
  try {
    Deno.statSync(`../fixture/${path}`);
    return `../fixture/${path}`;
  } catch (_) {
    return `fixture/${path}`;
  }
}

describe("bulk_editor", () => {
  const before = Deno.readTextFileSync(fixturePath("main.ledger"));
  const transactions = JSON.parse(
    Deno.readTextFileSync(fixturePath("main.transactions.json")),
  );
  Array.from(Deno.readDirSync(fixturePath("bulk_edit"))).forEach(
    ({ name: dir }) => {
      test(dir, () => {
        const files = Array.from(
          Deno.readDirSync(fixturePath(`bulk_edit/${dir}`)),
          ({ name }) => name,
        );
        for (const file of files) {
          const [name, extension] = file.split(".");
          if (extension === "ledger") {
            const args = JSON.parse(
              Deno.readTextFileSync(
                fixturePath(`bulk_edit/${dir}/${name}.json`),
              ),
            );
            const after = Deno.readTextFileSync(
              fixturePath(`bulk_edit/${dir}/${name}.ledger`),
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
            expect(trim(newLedgerFile.content)).toBe(
              trim(after.toString()),
            );
          }
        }
      });
    },
  );
});
