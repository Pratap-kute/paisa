import { ensureDir } from "@std/fs";
import { COVERAGE_THRESHOLD } from "../vitest.shared.ts";

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
  project: "core" | "component",
  coverage: boolean,
  env: Record<string, string> = {},
) {
  const args = [
    "run",
    "-A",
    "npm:vitest@^4",
    "run",
    "--config",
    "vitest.config.ts",
    `--project=${project}`,
    "--maxWorkers=1",
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
  "core",
  true,
  reportOnly ? { COVERAGE_REPORT_ONLY: "true" } : {},
);
if (!core.success) Deno.exit(core.code);

// Component coverage is intentionally informational. It has a much broader UI
// denominator and should not obscure whether the core logic is well tested.
const component = await runVitest("component", true);
if (!component.success) Deno.exit(component.code);

const summary = JSON.parse(
  await Deno.readTextFile("coverage/core/coverage-summary.json"),
).total as Record<string, { pct: number }>;
const failed = ["lines", "statements", "functions", "branches"].filter(
  (metric) => summary[metric].pct < COVERAGE_THRESHOLD,
);
if (failed.length) {
  const message = `Core frontend coverage is below ${COVERAGE_THRESHOLD}%: ${
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
