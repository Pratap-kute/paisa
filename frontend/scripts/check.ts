import { glob } from "node:fs/promises";

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) process.exit(code);
}

async function toolingFiles(): Promise<string[]> {
  const patterns = [
    "scripts/*.ts",
    "*.config.ts",
    "tests/browser/*.ts",
  ];
  const files = new Set<string>();

  for (const pattern of patterns) {
    for await (const file of glob(pattern)) {
      files.add(file);
    }
  }

  return [...files].sort();
}

await run(["bun", "x", "svelte-kit", "sync"]);

await run(["bun", "check", "--no-script", ...await toolingFiles()]);

if (!process.argv.includes("--tooling")) {
  await run([
    "bun",
    "x",
    "svelte-check",
    "--tsconfig",
    "./tsconfig.json",
  ]);
}
