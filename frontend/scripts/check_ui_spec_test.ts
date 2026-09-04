import { expect } from "@std/expect";
import {
  extractDefinedCssVariables,
  findBitsUiViolations,
  findBulmaClassViolations,
  findBulmaViolations,
  findForbiddenTokenViolations,
  findImportantViolations,
  findRawPaletteViolations,
  findUndefinedTokenViolations,
  FORBIDDEN_BULMA_CLASSES,
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

Deno.test("findBitsUiViolations forbids direct imports outside src/lib/shared/ui (including multiline)", () => {
  const singleLine = `import { Dialog } from "bits-ui";`;
  const multiLine = `import {
    Dialog,
    Tabs,
  } from "bits-ui";`;
  const dynamicImport = `const modal = import("bits-ui/dialog");`;

  for (const sample of [singleLine, multiLine, dynamicImport]) {
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
  }
});

Deno.test("findBulmaViolations catches old Bulma imports", () => {
  const sample = `@import "bulma/css/bulma.css";`;
  const violations = findBulmaViolations("src/routes/+layout.svelte", sample);
  expect(violations.length).toBe(1);
  expect(violations[0].rule).toBe("no-bulma-imports");
});

Deno.test("findBulmaClassViolations catches removed classes in class attributes and directives", () => {
  const sample = `
    <div class="has-text-success is-size-7"></div>
    <div class={'table ' + (compact ? 'is-narrow' : '')}></div>
    <div class:has-text-right={alignAmounts}></div>
  `;
  const violations = findBulmaClassViolations(
    "src/routes/(app)/sample/+page.svelte",
    sample,
  );
  expect(violations.map((violation) => violation.detail)).toEqual([
    expect.stringContaining("has-text-success"),
    expect.stringContaining("is-size-7"),
    expect.stringContaining("table"),
    expect.stringContaining("is-narrow"),
    expect.stringContaining("has-text-right"),
  ]);
  expect(
    violations.every((violation) =>
      violation.rule === "no-bulma-compat-classes"
    ),
  ).toBe(true);
});

Deno.test("findBulmaClassViolations covers every removed compatibility class", () => {
  const content = `<div class="${
    [...FORBIDDEN_BULMA_CLASSES].join(" ")
  }"></div>`;
  const violations = findBulmaClassViolations(
    "src/lib/features/sample/Legacy.svelte",
    content,
  );
  expect(violations.length).toBe(FORBIDDEN_BULMA_CLASSES.size);
});

Deno.test("findBulmaClassViolations avoids prose, selectors, and partial-name false positives", () => {
  const sample = `
    // Do not add has-text-danger to application markup.
    const description = "table is-narrow";
    const tableRows = [];
    .has-text-info { color: red; }
    <div class="paisa-table is-smallish has-text-greyish"></div>
  `;
  expect(
    findBulmaClassViolations("src/routes/sample.svelte", sample),
  ).toEqual([]);
  expect(
    findBulmaClassViolations(
      "src/lib/shared/styles/legacy/bulma-compat.css",
      `.has-text-info { color: red; }`,
    ),
  ).toEqual([]);
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

  const removedCompatibilityFile = findImportantViolations(
    "src/lib/shared/styles/legacy/bulma-compat.css",
    sample,
  );
  expect(removedCompatibilityFile.length).toBe(1);
});

Deno.test("findForbiddenTokenViolations catches removed tokens in every file", () => {
  const sample = `
    <span class="text-[var(--paisa-danger)] bg-[var(--paisa-danger-light)]">Error</span>
    <span class="text-[var(--paisa-success)] bg-[var(--paisa-success-light)]">OK</span>
    <span class="text-[var(--paisa-info)] bg-[var(--paisa-info-light)]">Info</span>
    .legacy { color: var(--paisa-text-primary); background: var(--paisa-surface-card); }
  `;
  const violations = findForbiddenTokenViolations(
    "src/routes/(app)/sample/+page.svelte",
    sample,
  );
  expect(violations.length).toBe(8);
  expect(violations.every((v) => v.rule === "no-forbidden-paisa-tokens")).toBe(
    true,
  );

  const definitionViolations = findForbiddenTokenViolations(
    "src/lib/shared/theme/tokens.css",
    sample,
  );
  expect(definitionViolations.length).toBe(8);
});

Deno.test("findForbiddenTokenViolations covers the complete removed token set", () => {
  const removedTokens = [
    "--paisa-canvas-bg",
    "--paisa-surface-bg",
    "--paisa-surface-card",
    "--paisa-surface-active",
    "--paisa-surface-muted",
    "--paisa-text-primary",
    "--paisa-text-secondary",
    "--paisa-text-muted",
    "--paisa-text-inverse",
    "--paisa-brand-primary",
    "--paisa-brand-primary-hover",
    "--paisa-brand-primary-light",
    "--paisa-brand-accent",
    "--paisa-border-default",
    "--paisa-success",
    "--paisa-success-light",
    "--paisa-danger",
    "--paisa-danger-light",
    "--paisa-info",
    "--paisa-info-light",
    "--paisa-warning-light",
  ];
  const violations = findForbiddenTokenViolations(
    "src/lib/shared/styles/foundation.css",
    removedTokens.map((token) => `${token}: red;`).join("\n"),
  );
  expect(violations.length).toBe(removedTokens.length);
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

Deno.test("extractDefinedCssVariables extracts tokens strictly from approved files", async () => {
  const tokens = await extractDefinedCssVariables(Deno.cwd());
  expect(tokens.has("--paisa-canvas")).toBe(true);
  expect(tokens.has("--paisa-surface")).toBe(true);
  expect(tokens.has("--paisa-primary")).toBe(true);
  expect(tokens.has("--paisa-positive")).toBe(true);
  expect(tokens.has("--paisa-negative")).toBe(true);
  expect(tokens.has("--paisa-prediction-high")).toBe(true);
});
