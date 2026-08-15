import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type UserConfig } from "vitest/config";

type VitestPluginOption = NonNullable<UserConfig["plugins"]>[number];

export default defineConfig({
  plugins: [svelte() as unknown as VitestPluginOption],
  resolve: {
    conditions: ["browser"],
    alias: {
      "$app/navigation": fileURLToPath(
        new URL("./src/test/navigation.ts", import.meta.url),
      ),
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      xlsx: fileURLToPath(
        new URL("./src/lib/vendor/xlsx.mjs", import.meta.url),
      ),
    },
  },
  test: {
    environment: "happy-dom",
    server: {
      deps: {
        inline: [/svelte/, /@testing-library/],
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
