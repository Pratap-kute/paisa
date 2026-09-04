import { expect } from "@std/expect";
import {
  findBitsUiViolations,
  findBulmaViolations,
  findImportantViolations,
  findRawPaletteViolations,
  findUndefinedTokenViolations,
} from "./check_ui_spec.ts";

Deno.test("findRawPaletteViolations catches arbitrary raw palette classes", () => {
  const sample = `
    <div class="text-red-500 bg-emerald-600 border-blue-400 hover:text-gray-700">
      <span class="text-muted-foreground">Valid semantic</span>
      <span class="paisa-amount">Valid</span>
    </div>
  `;
  const violations = findRawPaletteViolations(
    "src/routes/sample.svelte",
    sample,
  );
  expect(violations.length).toBe(4);
  expect(violations.map((v) => v.rule)).toEqual([
    "no-raw-palette-colors",
    "no-raw-palette-colors",
    "no-raw-palette-colors",
    "no-raw-palette-colors",
  ]);
});

Deno.test("findRawPaletteViolations ignores semantic color classes", () => {
  const sample = `
    <div class="text-primary bg-primary-subtle text-negative bg-negative-subtle text-neutral">
      <span class="border-border bg-surface text-foreground">Semantic OK</span>
    </div>
  `;
  const violations = findRawPaletteViolations(
    "src/routes/sample.svelte",
    sample,
  );
  expect(violations.length).toBe(0);
});

Deno.test("findBitsUiViolations forbids direct imports outside src/lib/shared/ui", () => {
  const sample = `import { Dialog } from "bits-ui";`;
  const violations = findBitsUiViolations(
    "src/lib/features/importing/Modal.svelte",
    sample,
  );
  expect(violations.length).toBe(1);
  expect(violations[0].rule).toBe("bits-ui-wrapper-only");

  // Allowed in src/lib/shared/ui/
  const allowedViolations = findBitsUiViolations(
    "src/lib/shared/ui/Dialog.svelte",
    sample,
  );
  expect(allowedViolations.length).toBe(0);
});

Deno.test("findBulmaViolations catches old Bulma imports", () => {
  const sample = `@import "bulma/css/bulma.css";`;
  const violations = findBulmaViolations("src/routes/+layout.svelte", sample);
  expect(violations.length).toBe(1);
  expect(violations[0].rule).toBe("no-bulma-imports");
});

Deno.test("findImportantViolations enforces integration allowlist", () => {
  const sample = `.rule { color: red !important; }`;
  const disallowed = findImportantViolations("src/routes/+page.svelte", sample);
  expect(disallowed.length).toBe(1);
  expect(disallowed[0].rule).toBe("no-unauthorized-important");

  const allowed = findImportantViolations(
    "src/lib/shared/styles/integrations/codemirror.css",
    sample,
  );
  expect(allowed.length).toBe(0);
});

Deno.test("findUndefinedTokenViolations flags undefined tokens but allows dynamic allowlist", () => {
  const defined = new Set(["--paisa-primary", "--paisa-surface"]);
  const sample = `
    color: var(--paisa-primary);
    background: var(--paisa-bogus-token);
    background: var(--paisa-category-color);
    background: var(--paisa-chart-series-1);
  `;
  const violations = findUndefinedTokenViolations(
    "src/routes/sample.svelte",
    sample,
    defined,
  );
  expect(violations.length).toBe(1);
  expect(violations[0].detail).toContain("--paisa-bogus-token");
});
