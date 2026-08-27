import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type ViteUserConfig } from "vitest/config";
import { coverageThreshold, sharedResolve } from "./vitest.shared.ts";

type VitestPluginOption = NonNullable<ViteUserConfig["plugins"]>[number];

const coreProject = defineConfig({
  plugins: [svelte() as unknown as VitestPluginOption],
  resolve: sharedResolve,
  test: {
    name: "core",
    environment: "happy-dom",
    include: ["tests/core/**/*.test.ts"],
    setupFiles: ["./tests/setup/core.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage/core",
      include: [
        "src/lib/domain/**/*.ts",
        "src/lib/features/**/*.ts",
        "src/lib/shared/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/lib/shared/theme/colors.ts",
        "src/lib/shared/ui/icon.ts",
        "src/lib/shared/vendor/**",
        "src/lib/features/editor/schedule_extension.ts",
        "src/lib/features/importing/{export,pdf}.ts",
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
    setupFiles: ["./tests/setup/setup.ts"],
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
