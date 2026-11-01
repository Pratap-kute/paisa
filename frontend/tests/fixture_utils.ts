import { basename, join } from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";

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
      Object.entries(value)
        .filter(([key]) => !GENERATED_ID_KEYS.includes(key))
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
  const info = await fs.stat(source);
  if (info.isDirectory()) {
    await fs.mkdir(target, { recursive: true });
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      if (!shouldCopyFixtureEntry(entry)) continue;
      await copyFixtureEntry(join(source, entry), join(target, entry));
    }
    return;
  }
  await fs.copyFile(source, target);
}

export async function copyFixtureSourceToTemp(
  sourceDir: string,
): Promise<string> {
  const tempDir = await fs.mkdtemp(
    join(os.tmpdir(), `paisa-fixture-${basename(sourceDir)}-`),
  );
  const entries = await fs.readdir(sourceDir);
  for (const entry of entries) {
    if (!shouldCopyFixtureEntry(entry)) continue;
    await copyFixtureEntry(join(sourceDir, entry), join(tempDir, entry));
  }
  return tempDir;
}

export function fixturePort(name: string): number {
  const names = Array.from(fsSync.readdirSync(FIXTURE_ROOT)).sort();
  const index = names.indexOf(name);
  if (index < 0) {
    throw new Error(`Unknown fixture directory: ${name}`);
  }
  return BASE_PORT + index + 1;
}
