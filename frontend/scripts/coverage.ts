import fs from "node:fs/promises";
import fsSync from "node:fs";
import { COVERAGE_THRESHOLD } from "../vitest.shared.ts";

fsSync.mkdirSync("coverage", { recursive: true });

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
  if (!fsSync.existsSync(".svelte-kit/tsconfig.json")) {
    const proc = Bun.spawn(["bun", "x", "svelte-kit", "sync"], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;
  }
}

async function runVitest(
  project: "core" | "component",
  coverage: boolean,
  env: Record<string, string> = {},
) {
  const args = [
    "bun",
    "x",
    "vitest",
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
  const proc = Bun.spawn(args, {
    env: {
      ...process.env,
      ...env,
      VITE_CONFIG_NATIVE_IGNORE_WARNING: "true",
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  return { success: code === 0, code };
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
  const entries = await fs.readdir(CORE_TEST_DIRECTORY, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".test.ts")) continue;
    const source = await fs.readFile(
      `${CORE_TEST_DIRECTORY}/${entry.name}`,
      "utf-8",
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
    for (const metric of [
      "lines",
      "statements",
      "functions",
      "branches",
    ] as const) {
      totals[metric].total += metrics[metric].total;
      totals[metric].covered += metrics[metric].covered;
      totals[metric].skipped += metrics[metric].skipped;
    }
  }

  for (const metric of [
    "lines",
    "statements",
    "functions",
    "branches",
  ] as const) {
    const { total, covered } = totals[metric];
    totals[metric].pct =
      total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2));
  }

  return totals;
}

async function readCoverageSummary(
  project: "core" | "component",
): Promise<CoverageSummary> {
  const summaryPath = `coverage/${project}/coverage-summary.json`;
  try {
    const content = await fs.readFile(summaryPath, "utf-8");
    return JSON.parse(content);
  } catch (_error) {
    let listing = "";
    try {
      const entries = fsSync.readdirSync(`coverage/${project}`);
      listing = entries.join(", ");
    } catch (_) {
      listing = "(directory missing)";
    }
    throw new Error(
      `Missing ${summaryPath}. Found in coverage/${project}: ${listing}`,
    );
  }
}

await ensureSvelteKitSync();

const reportOnly = process.argv.includes("--report-only");
const core = await runVitest(
  "core",
  true,
  reportOnly ? { COVERAGE_REPORT_ONLY: "true" } : {},
);
if (!core.success) process.exit(core.code);

const coreSummary = aggregateCoreCoverage(
  await readCoverageSummary("core"),
  await coreCoverageTargets(),
);
console.log(
  `Core coverage: ${["lines", "statements", "functions", "branches"]
    .map((metric) => {
      const value = coreSummary[metric as keyof FileCoverage];
      return `${metric}=${value.pct}%`;
    })
    .join(", ")}`,
);
const failed = ["lines", "statements", "functions", "branches"].filter(
  (metric) =>
    coreSummary[metric as keyof FileCoverage].pct < COVERAGE_THRESHOLD,
);
if (failed.length) {
  const message = `Core frontend coverage is below ${COVERAGE_THRESHOLD}%: ${failed
    .map((metric) => {
      const value = coreSummary[metric as keyof FileCoverage];
      return `${metric}=${value.pct}%`;
    })
    .join(", ")}`;
  if (reportOnly) {
    console.warn(`Coverage target not enforced yet: ${message}`);
  } else {
    throw new Error(message);
  }
}

const component = await runVitest("component", true);
if (!component.success) process.exit(component.code);

console.log("Core coverage report: coverage/core/index.html");
console.log("Component coverage report: coverage/component/index.html");
