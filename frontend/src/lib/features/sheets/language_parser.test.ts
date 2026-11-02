import { describe, test } from "bun:test";
import { sheetLanguage } from "#lib/features/sheets/language";
import { fileTests } from "@lezer/generator/dist/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const caseDir = dirname(fileURLToPath(import.meta.url));

const parser = sheetLanguage.parser.configure({
  strict: false,
  dialect: "comment",
});

for (const { name: file } of fs.readdirSync(caseDir, { withFileTypes: true })) {
  if (!/\.txt$/.test(file)) continue;

  const name = file.split(".", 1)[0];
  describe(name, () => {
    for (const { name, run } of fileTests(
      fs.readFileSync(join(caseDir, file), "utf-8"),
      file,
    )) {
      test(name, () => run(parser));
    }
  });
}
