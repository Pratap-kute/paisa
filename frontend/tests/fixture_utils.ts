import { basename, join } from "@std/path";

const FIXTURE_ROOT = "tests/fixture";
const BASE_PORT = 5700;

const GENERATED_ID_KEYS = [
  "id",
  "transaction_id",
  "endLine",
  "transaction_end_line",
];

export function withoutGeneratedIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutGeneratedIds);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([key]) => !GENERATED_ID_KEYS.includes(key))
        .map(([key, item]) => [key, withoutGeneratedIds(item)]),
    );
  }
  return value;
}

function shouldCopyFixtureEntry(name: string): boolean {
  if (name === "paisa.db") return false;
  if (name.endsWith(".json")) return false;
  return true;
}

async function copyFixtureEntry(source: string, target: string) {
  const info = await Deno.stat(source);
  if (info.isDirectory) {
    await Deno.mkdir(target, { recursive: true });
    for await (const entry of Deno.readDir(source)) {
      if (!shouldCopyFixtureEntry(entry.name)) continue;
      await copyFixtureEntry(
        join(source, entry.name),
        join(target, entry.name),
      );
    }
    return;
  }
  await Deno.copyFile(source, target);
}

export async function copyFixtureSourceToTemp(
  sourceDir: string,
): Promise<string> {
  const tempDir = await Deno.makeTempDir({
    prefix: `paisa-fixture-${basename(sourceDir)}-`,
  });
  for await (const entry of Deno.readDir(sourceDir)) {
    if (!shouldCopyFixtureEntry(entry.name)) continue;
    await copyFixtureEntry(
      join(sourceDir, entry.name),
      join(tempDir, entry.name),
    );
  }
  return tempDir;
}

export function fixturePort(name: string): number {
  const names = Array.from(Deno.readDirSync(FIXTURE_ROOT))
    .map((entry) => entry.name)
    .sort();
  const index = names.indexOf(name);
  if (index < 0) {
    throw new Error(`Unknown fixture directory: ${name}`);
  }
  return BASE_PORT + index + 1;
}
