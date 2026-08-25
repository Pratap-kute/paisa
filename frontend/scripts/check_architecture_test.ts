import { expect } from "@std/expect";
import {
  classifyViolation,
  extractStaticImports,
} from "./check_architecture.ts";

const root = "/workspace/frontend";

Deno.test("extracts TypeScript, Svelte, export-from, and dynamic static imports", () => {
  expect(
    extractStaticImports(`
      import type { Posting } from "$lib/domain/ledger";
      import Button from "$lib/shared/ui/Button.svelte";
      export { api } from "../api/client.ts";
      const chart = import("$lib/shared/charts/echarts/core");
    `),
  ).toEqual([
    "$lib/domain/ledger",
    "$lib/shared/ui/Button.svelte",
    "../api/client.ts",
    "$lib/shared/charts/echarts/core",
  ]);
});

Deno.test("allows intended dependency direction", () => {
  expect(
    classifyViolation(
      `${root}/src/lib/features/expense/data.ts`,
      "$lib/domain/ledger",
      root,
    ),
  ).toBeNull();
  expect(
    classifyViolation(
      `${root}/src/routes/+page.svelte`,
      "$lib/features/expense/page",
      root,
    ),
  ).toBeNull();
});

for (
  const [name, source, imported, rule] of [
    ["domain to Svelte", "src/lib/domain/money.ts", "svelte", "domain"],
    [
      "domain to feature",
      "src/lib/domain/money.ts",
      "$lib/features/assets/data",
      "domain",
    ],
    [
      "shared to feature",
      "src/lib/shared/charts/data.ts",
      "$lib/features/assets/data",
      "shared",
    ],
    [
      "feature to route",
      "src/lib/features/assets/data.ts",
      "../../../routes/+page.svelte",
      "features",
    ],
    [
      "api to feature",
      "src/lib/api/client.ts",
      "$lib/features/assets/data",
      "api",
    ],
    [
      "generated to route",
      "src/lib/generated/search/parser.js",
      "../../../routes/+page.svelte",
      "generated",
    ],
  ] as const
) {
  Deno.test(`rejects ${name}`, () => {
    const violation = classifyViolation(`${root}/${source}`, imported, root);
    expect(violation?.rule).toMatch(new RegExp(rule));
    expect(violation?.imported).toBe(imported);
  });
}
