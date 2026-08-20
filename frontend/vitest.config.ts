import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type ViteUserConfig } from "vitest/config";
import { coverageThreshold, sharedResolve } from "./vitest.shared";

type VitestPluginOption = NonNullable<ViteUserConfig["plugins"]>[number];

const coreProject = defineConfig({
  resolve: sharedResolve,
  test: {
    name: "core",
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
        lines: coverageThreshold(),
        statements: coverageThreshold(),
        functions: coverageThreshold(),
        branches: coverageThreshold(),
      },
    },
  },
});

const componentProject = defineConfig({
  plugins: [svelte() as unknown as VitestPluginOption],
  resolve: {
    ...sharedResolve,
    conditions: ["browser"],
  },
  test: {
    name: "component",
    environment: "happy-dom",
    server: {
      deps: {
        inline: [/svelte/, /@testing-library/, /bits-ui/, /runed/],
      },
    },
    include: ["src/**/*.component.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage/component",
      include: ["src/**/*.{ts,svelte}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/**/parser.ts",
        "src/**/parser.terms.ts",
      ],
    },
  },
});

export default defineConfig({
  test: {
    projects: [coreProject, componentProject],
  },
});
