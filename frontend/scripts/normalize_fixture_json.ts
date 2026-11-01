import { join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { withoutGeneratedIds } from "../tests/fixture_utils.ts";

const fixtureRoot = fileURLToPath(new URL("../tests/fixture", import.meta.url));

const entries = await fs.readdir(fixtureRoot, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const fixtureDir = join(fixtureRoot, entry.name);
  const files = await fs.readdir(fixtureDir, { withFileTypes: true });
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json")) continue;
    const path = join(fixtureDir, file.name);
    const current = JSON.parse(await fs.readFile(path, "utf-8"));
    const normalized = withoutGeneratedIds(current);
    await fs.writeFile(path, JSON.stringify(normalized, null, 2) + "\n");
    console.log(`normalized ${path}`);
  }
}
