import { ensureDir } from "@std/fs";
import { COVERAGE_THRESHOLD } from "../vitest.shared.ts";

await ensureDir("coverage");

const CORE_COVERAGE_FILES = [
  "src/lib/core/",
  "src/lib/domain/",
  "src/lib/importing/",
  "src/lib/ledger/",
  "src/lib/sheet/",
];

const CORE_COVERAGE_EXCLUDES = new Set([
  "src/lib/core/colors.ts",
  "src/lib/core/icon.ts",
  "src/lib/domain/transaction_tag.ts",
  "src/lib/importing/export.ts",
  "src/lib/importing/pdf.ts",
  "src/lib/sheet/language.ts",
  "src/lib/sheet/parser.ts",
  "src/lib/sheet/parser.terms.ts",
]);

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

function isCoreCoverageFile(filePath: string): boolean {
  const relative = relativeCoveragePath(filePath);
  if (relative.endsWith(".test.ts") || relative.endsWith(".d.ts")) {
    return false;
  }
  if (CORE_COVERAGE_EXCLUDES.has(relative)) return false;
  return CORE_COVERAGE_FILES.some((prefix) => relative.startsWith(prefix));
}

function aggregateCoreCoverage(summary: CoverageSummary): FileCoverage {
  const totals = {
    lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
    statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
    functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
  };

  for (const [filePath, metrics] of Object.entries(summary)) {
    if (filePath === "total" || !isCoreCoverageFile(filePath)) continue;
    for (const metric of ["lines", "statements", "functions", "branches"] as const) {
      totals[metric].total += metrics[metric].total;
      totals[metric].covered += metrics[metric].covered;
      totals[metric].skipped += metrics[metric].skipped;
    }
  }

  for (const metric of ["lines", "statements", "functions", "branches"] as const) {
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

const coreSummary = aggregateCoreCoverage(await readCoverageSummary("core"));
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
