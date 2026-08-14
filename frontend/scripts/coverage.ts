import { ensureDir } from "@std/fs";

await ensureDir("coverage");

async function ensureSvelteKitSync() {
  try {
    Deno.statSync(".svelte-kit/tsconfig.json");
  } catch (_) {
    await new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", "npm:@sveltejs/kit", "sync"],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn().status;
  }
}

await ensureSvelteKitSync();

async function runVitest(
  config: string,
  coverage: boolean,
  env: Record<string, string> = {},
) {
  const args = [
    "run",
    "-A",
    "npm:vitest@^3.2.7",
    "run",
    "--config",
    config,
    "--pool=threads",
    "--maxWorkers=1",
    "--minWorkers=1",
  ];
  if (coverage) args.push("--coverage");
  return await new Deno.Command(Deno.execPath(), {
    args,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
}

// Core coverage is the enforceable business-logic signal. In report-only mode
// Vitest still produces the same report, but its threshold failure is ignored.
const reportOnly = Deno.args.includes("--report-only");
const core = await runVitest(
  "vitest.core.config.ts",
  true,
  reportOnly ? { COVERAGE_REPORT_ONLY: "true" } : {},
);
if (!core.success) Deno.exit(core.code);

// Component coverage is intentionally informational. It has a much broader UI
// denominator and should not obscure whether the core logic is well tested.
const component = await new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "-A",
    "npm:vitest@^3.2.7",
    "run",
    "--config",
    "vitest.config.ts",
    "--coverage",
    "--pool=threads",
    "--maxWorkers=1",
    "--minWorkers=1",
  ],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
}).spawn().status;
if (!component.success) Deno.exit(component.code);

const summary = JSON.parse(
  await Deno.readTextFile("coverage/core/coverage-summary.json"),
).total as Record<string, { pct: number }>;
const threshold = 60;
const failed = ["lines", "statements", "functions", "branches"].filter(
  (metric) => summary[metric].pct < threshold,
);
if (failed.length) {
  const message = `Core frontend coverage is below ${threshold}%: ${
    failed.map((metric) => `${metric}=${summary[metric].pct}%`).join(", ")
  }`;
  if (Deno.args.includes("--report-only")) {
    console.warn(`Coverage target not enforced yet: ${message}`);
  } else {
    throw new Error(message);
  }
}

console.log("Core coverage report: coverage/core/index.html");
console.log("Component coverage report: coverage/component/index.html");
