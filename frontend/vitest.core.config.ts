import { defineConfig } from "vitest/config";
import process from "node:process";

const threshold = process.env.COVERAGE_REPORT_ONLY === "true" ? 0 : 60;

export default defineConfig({
  resolve: {
    alias: {
      "$app/navigation":
        new URL("./src/test/navigation.ts", import.meta.url).pathname,
      $lib: new URL("./src/lib", import.meta.url).pathname,
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/core/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage/core",
      include: [
        "src/lib/core/**/*.ts",
        "src/lib/domain/**/*.ts",
        "src/lib/importing/**/*.ts",
        "src/lib/ledger/**/*.ts",
        "src/lib/sheet/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/lib/core/{colors,icon}.ts",
        "src/lib/domain/transaction_tag.ts",
        "src/lib/importing/{export,pdf}.ts",
        "src/lib/sheet/{language,parser,parser.terms}.ts",
      ],
      thresholds: {
        lines: threshold,
        statements: threshold,
        functions: threshold,
        branches: threshold,
      },
    },
  },
});
