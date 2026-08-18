import { fromFileUrl, join } from "@std/path";
import { withoutGeneratedIds } from "../tests/fixture_utils.ts";

const fixtureRoot = fromFileUrl(new URL("../tests/fixture", import.meta.url));

for await (const entry of Deno.readDir(fixtureRoot)) {
  if (!entry.isDirectory) continue;
  const fixtureDir = join(fixtureRoot, entry.name);
  for await (const file of Deno.readDir(fixtureDir)) {
    if (!file.isFile || !file.name.endsWith(".json")) continue;
    const path = join(fixtureDir, file.name);
    const current = JSON.parse(await Deno.readTextFile(path));
    const normalized = withoutGeneratedIds(current);
    await Deno.writeTextFile(path, JSON.stringify(normalized, null, 2) + "\n");
    console.log(`normalized ${path}`);
  }
}
