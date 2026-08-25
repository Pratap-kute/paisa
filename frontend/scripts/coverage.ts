import { ensureDir } from "@std/fs";
import { COVERAGE_THRESHOLD } from "../vitest.shared.ts";

await ensureDir("coverage");

const CORE_TEST_DIRECTORY = "tests/core";

type CoverageMetric = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

type FileCoverage = {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
};

type CoverageSummary = {
  total: FileCoverage;
  [file: string]: FileCoverage;
};

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
  if (project === "core") {
    args.push("--pool=threads", "--no-isolate");
  }
  if (coverage) {
    args.push(
      "--coverage",
      `--coverage.reportsDirectory=coverage/${project}`,
      "--coverage.reporter=json-summary",
      "--coverage.reporter=text",
      "--coverage.reporter=html",
      "--coverage.reporter=lcov",
    );
    if (project === "component") {
      args.push("--coverage.clean=false");
    }
  }
  return await new Deno.Command(Deno.execPath(), {
    args,
    env: {
      ...env,
      VITE_CONFIG_NATIVE_IGNORE_WARNING: "true",
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
}

function relativeCoveragePath(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const marker = "/frontend/";
  const index = normalized.lastIndexOf(marker);
  return index >= 0 ? normalized.slice(index + marker.length) : normalized;
}

async function coreCoverageTargets(): Promise<Set<string>> {
  // The core gate covers modules explicitly owned by core tests. The generated
  // report remains repository-wide, while unrelated UI and vendor code is
  // measured by the component suite instead of diluting this unit-test signal.
  const targets = new Set<string>();
  for await (const entry of Deno.readDir(CORE_TEST_DIRECTORY)) {
    if (!entry.isFile || !entry.name.endsWith(".test.ts")) continue;
    const source = await Deno.readTextFile(
      `${CORE_TEST_DIRECTORY}/${entry.name}`,
    );
    for (const match of source.matchAll(/from\s+["']\$lib\/([^"']+)["']/g)) {
      targets.add(`src/lib/${match[1]}.ts`);
      targets.add(`src/lib/${match[1]}.js`);
    }
  }
  if (targets.size === 0) {
    throw new Error(`No $lib coverage targets found in ${CORE_TEST_DIRECTORY}`);
  }
  return targets;
}

function isCoreCoverageFile(
  filePath: string,
  targets: ReadonlySet<string>,
): boolean {
  const relative = relativeCoveragePath(filePath);
  return targets.has(relative);
}

function aggregateCoreCoverage(
  summary: CoverageSummary,
  targets: ReadonlySet<string>,
): FileCoverage {
  const totals = {
    lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
    statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
    functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
  };

  for (const [filePath, metrics] of Object.entries(summary)) {
    if (filePath === "total" || !isCoreCoverageFile(filePath, targets)) {
      continue;
    }
    for (
      const metric of ["lines", "statements", "functions", "branches"] as const
    ) {
      totals[metric].total += metrics[metric].total;
      totals[metric].covered += metrics[metric].covered;
      totals[metric].skipped += metrics[metric].skipped;
    }
  }

  for (
    const metric of ["lines", "statements", "functions", "branches"] as const
  ) {
    const { total, covered } = totals[metric];
    totals[metric].pct = total === 0
      ? 100
      : Number(((covered / total) * 100).toFixed(2));
  }

  return totals;
}

async function readCoverageSummary(
  project: "core" | "component",
): Promise<CoverageSummary> {
  const summaryPath = `coverage/${project}/coverage-summary.json`;
  try {
    return JSON.parse(await Deno.readTextFile(summaryPath));
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    let listing = "";
    try {
      listing = [...Deno.readDirSync(`coverage/${project}`)].map((entry) =>
        entry.name
      ).join(", ");
    } catch (_) {
      listing = "(directory missing)";
    }
    throw new Error(
      `Missing ${summaryPath}. Found in coverage/${project}: ${listing}`,
    );
  }
}

await ensureSvelteKitSync();

const reportOnly = Deno.args.includes("--report-only");
const core = await runVitest(
  "core",
  true,
  reportOnly ? { COVERAGE_REPORT_ONLY: "true" } : {},
);
if (!core.success) Deno.exit(core.code);

const coreSummary = aggregateCoreCoverage(
  await readCoverageSummary("core"),
  await coreCoverageTargets(),
);
console.log(
  `Core coverage: ${
    ["lines", "statements", "functions", "branches"].map((metric) => {
      const value = coreSummary[metric as keyof FileCoverage];
      return `${metric}=${value.pct}%`;
    }).join(", ")
  }`,
);
const failed = ["lines", "statements", "functions", "branches"].filter(
  (metric) =>
    coreSummary[metric as keyof FileCoverage].pct < COVERAGE_THRESHOLD,
);
if (failed.length) {
  const message = `Core frontend coverage is below ${COVERAGE_THRESHOLD}%: ${
    failed.map((metric) => {
      const value = coreSummary[metric as keyof FileCoverage];
      return `${metric}=${value.pct}%`;
    }).join(", ")
  }`;
  if (reportOnly) {
    console.warn(`Coverage target not enforced yet: ${message}`);
  } else {
    throw new Error(message);
  }
}

const component = await runVitest("component", true);
if (!component.success) Deno.exit(component.code);

console.log("Core coverage report: coverage/core/index.html");
console.log("Component coverage report: coverage/component/index.html");
