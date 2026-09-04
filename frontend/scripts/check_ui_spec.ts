import { extname, join, normalize, relative, resolve } from "@std/path";
import { walk } from "@std/fs";

export interface SpecViolation {
  file: string;
  rule: string;
  detail: string;
}

const PALETTE_COLORS = [
  "slate",
  "gray",
  "zinc",
  "stone",
  "neutral",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const PALETTE_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "outline",
  "fill",
  "stroke",
  "from",
  "to",
  "via",
  "divide",
  "accent",
  "decoration",
  "placeholder",
];

const RAW_PALETTE_REGEX = new RegExp(
  `\\b(?:[a-z0-9_-]+:)*(?:${PALETTE_PREFIXES.join("|")})-(?:${
    PALETTE_COLORS.join("|")
  })-(?:50|100|200|300|400|500|600|700|800|900|950)(?:/\\d+)?\\b`,
  "g",
);

export const DYNAMIC_TOKEN_PREFIX_ALLOWLIST = [
  "--paisa-category-color",
  "--paisa-min-col-width",
  "--paisa-chart-series-",
  "--paisa-chart-rows",
  "--paisa-switch-color",
  "--paisa-ledger-depth",
];

export const APPROVED_TOKEN_DEFINITION_FILES = [
  "src/lib/shared/styles/foundation.css",
  "src/lib/shared/theme/tokens.css",
];

export const FORBIDDEN_PAISA_TOKENS = new Set([
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
]);

export const FORBIDDEN_BULMA_CLASSES = new Set([
  "is-clipped",
  "is-small",
  "is-size-6",
  "is-size-7",
  "has-text-weight-bold",
  "has-text-weight-medium",
  "has-text-right",
  "has-text-centered",
  "has-text-success",
  "has-text-danger",
  "has-text-warning",
  "has-text-warning-dark",
  "has-text-info",
  "has-text-primary",
  "has-text-link",
  "has-text-grey",
  "has-text-grey-light",
  "has-text-grey-lighter",
  "has-text-grey-dark",
  "table",
  "is-narrow",
  "is-fullwidth",
  "is-hoverable",
]);

export const ALLOWED_IMPORTANT_FILES = new Set([
  "src/lib/shared/styles/integrations/codemirror.css",
  "src/lib/shared/styles/integrations/select.css",
  "src/lib/shared/styles/integrations/tabulator.css",
]);

const BITS_UI_IMPORT_REGEX =
  /(?:(?:import|export)\s+[\s\S]*?from\s+|import\(\s*)["'](bits-ui(?:\/[^"']*)?)["']/g;

export function findRawPaletteViolations(
  filePath: string,
  content: string,
): SpecViolation[] {
  const violations: SpecViolation[] = [];
  for (const match of content.matchAll(RAW_PALETTE_REGEX)) {
    violations.push({
      file: filePath,
      rule: "no-raw-palette-colors",
      detail: `Found raw palette color utility: '${
        match[0]
      }'. Use semantic Paisa theme utilities or tokens instead.`,
    });
  }
  return violations;
}

export function findBitsUiViolations(
  filePath: string,
  content: string,
): SpecViolation[] {
  const violations: SpecViolation[] = [];
  if (filePath.startsWith("src/lib/shared/ui/")) return violations;

  for (const match of content.matchAll(BITS_UI_IMPORT_REGEX)) {
    violations.push({
      file: filePath,
      rule: "bits-ui-wrapper-only",
      detail: `Direct import from '${
        match[1]
      }'. bits-ui imports are restricted to src/lib/shared/ui wrappers.`,
    });
  }
  return violations;
}

export function findBulmaViolations(
  filePath: string,
  content: string,
): SpecViolation[] {
  const violations: SpecViolation[] = [];
  const bulmaRegex =
    /@import\s+["'][^"']*bulma[^"']*["']|from\s+["']bulma["']/g;
  for (const match of content.matchAll(bulmaRegex)) {
    violations.push({
      file: filePath,
      rule: "no-bulma-imports",
      detail: `Found Bulma import '${
        match[0]
      }'. Bulma is deprecated and removed.`,
    });
  }
  return violations;
}

export function findBulmaClassViolations(
  filePath: string,
  content: string,
): SpecViolation[] {
  if (extname(filePath).toLowerCase() === ".css") return [];

  const violations: SpecViolation[] = [];
  const reported = new Set<string>();
  const report = (className: string) => {
    if (!FORBIDDEN_BULMA_CLASSES.has(className) || reported.has(className)) {
      return;
    }
    reported.add(className);
    violations.push({
      file: filePath,
      rule: "no-bulma-compat-classes",
      detail:
        `Found removed Bulma compatibility class '${className}' in application markup. Use Tailwind utilities or a shared Paisa primitive instead.`,
    });
  };

  // Restrict matching to quoted class attributes. This covers static classes and
  // quoted branches inside Svelte class expressions without matching prose,
  // selectors, object properties, or unrelated strings.
  const classAttributeRegex =
    /(?:^|[\s<{])class(?:Name)?\s*=\s*(["'`])([\s\S]*?)\1/g;
  for (const attribute of content.matchAll(classAttributeRegex)) {
    for (const token of attribute[2].matchAll(/[a-z][a-z0-9-]*/g)) {
      report(token[0]);
    }
  }

  // Also inspect string literals inside class={...} expressions. Identifiers are
  // deliberately ignored because their runtime values cannot be inferred here.
  const expressionAttributeRegex =
    /(?:^|[\s<{])class(?:Name)?\s*=\s*\{([\s\S]*?)\}/g;
  for (const attribute of content.matchAll(expressionAttributeRegex)) {
    for (const literal of attribute[1].matchAll(/(["'`])([\s\S]*?)\1/g)) {
      for (const token of literal[2].matchAll(/[a-z][a-z0-9-]*/g)) {
        report(token[0]);
      }
    }
  }

  // Svelte's class:name={condition} directive does not use a class attribute.
  for (const directive of content.matchAll(/\bclass:([a-z][a-z0-9-]*)\b/g)) {
    report(directive[1]);
  }

  return violations;
}

export function findImportantViolations(
  filePath: string,
  content: string,
): SpecViolation[] {
  if (ALLOWED_IMPORTANT_FILES.has(filePath)) return [];
  const violations: SpecViolation[] = [];
  if (content.includes("!important")) {
    violations.push({
      file: filePath,
      rule: "no-unauthorized-important",
      detail:
        "!important is forbidden outside documented integration override stylesheets.",
    });
  }
  return violations;
}

export function findForbiddenTokenViolations(
  filePath: string,
  content: string,
): SpecViolation[] {
  const violations: SpecViolation[] = [];

  for (const match of content.matchAll(/--paisa-[a-z0-9-]+/g)) {
    const token = match[0];
    if (FORBIDDEN_PAISA_TOKENS.has(token)) {
      violations.push({
        file: filePath,
        rule: "no-forbidden-paisa-tokens",
        detail:
          `Found removed token '${token}'. Use canonical Paisa semantic tokens instead.`,
      });
    }
  }
  return violations;
}

export async function extractDefinedCssVariables(
  frontendRoot: string,
): Promise<Set<string>> {
  const defined = new Set<string>();

  for (const relPath of APPROVED_TOKEN_DEFINITION_FILES) {
    const fullPath = join(frontendRoot, relPath);
    try {
      const content = await Deno.readTextFile(fullPath);
      for (const match of content.matchAll(/(--paisa-[a-z0-9-]+)\s*:/g)) {
        defined.add(match[1]);
      }
    } catch {
      // File not found or unreadable; checker will report missing definitions
    }
  }

  return defined;
}

export function findUndefinedTokenViolations(
  filePath: string,
  content: string,
  definedTokens: Set<string>,
): SpecViolation[] {
  const violations: SpecViolation[] = [];
  if (filePath.startsWith("src/lib/shared/vendor/")) {
    return violations;
  }

  for (const match of content.matchAll(/--paisa-[a-z0-9-]+/g)) {
    const token = match[0];
    const isDefined = definedTokens.has(token);
    const isAllowlisted = DYNAMIC_TOKEN_PREFIX_ALLOWLIST.some((prefix) =>
      token.startsWith(prefix)
    );

    if (!isDefined && !isAllowlisted) {
      violations.push({
        file: filePath,
        rule: "no-undefined-paisa-tokens",
        detail:
          `Undefined CSS variable '${token}'. Tokens must be registered in tokens.css or foundation.css.`,
      });
    }
  }
  return violations;
}

export async function checkUiSpec(
  frontendRoot = Deno.cwd(),
): Promise<SpecViolation[]> {
  frontendRoot = normalize(resolve(frontendRoot));
  const srcDir = join(frontendRoot, "src");
  const violations: SpecViolation[] = [];

  const definedTokens = await extractDefinedCssVariables(frontendRoot);

  for await (const entry of walk(srcDir)) {
    const relPath = relative(frontendRoot, entry.path).replaceAll("\\", "/");

    // Skip vendor
    if (relPath.startsWith("src/lib/shared/vendor/")) continue;

    const ext = extname(entry.name).toLowerCase();

    // 1. SCSS / SASS prohibition
    if (entry.isFile && (ext === ".scss" || ext === ".sass")) {
      violations.push({
        file: relPath,
        rule: "no-scss-or-sass",
        detail:
          `Found '${entry.name}'. SCSS/SASS is forbidden; Paisa uses Tailwind v4 & Vanilla CSS.`,
      });
      continue;
    }

    if (!entry.isFile) continue;

    if ([".svelte", ".ts", ".js", ".html", ".css"].includes(ext)) {
      const content = await Deno.readTextFile(entry.path);

      // 2. Raw palette check (for template/code/markup files)
      if (ext !== ".css") {
        violations.push(...findRawPaletteViolations(relPath, content));
      }

      // 3. bits-ui check
      if ([".svelte", ".ts", ".js"].includes(ext)) {
        violations.push(...findBitsUiViolations(relPath, content));
      }

      // 4. Bulma import check
      violations.push(...findBulmaViolations(relPath, content));

      // 5. Removed Bulma compatibility class check
      violations.push(...findBulmaClassViolations(relPath, content));

      // 6. !important check
      violations.push(...findImportantViolations(relPath, content));

      // 7. Removed legacy/deprecated tokens check
      violations.push(...findForbiddenTokenViolations(relPath, content));

      // 8. Undefined tokens check
      violations.push(
        ...findUndefinedTokenViolations(relPath, content, definedTokens),
      );
    }
  }

  return violations;
}

if (import.meta.main) {
  const violations = await checkUiSpec();
  if (violations.length) {
    console.error(
      `UI Specification guard failed with ${violations.length} violation(s):\n`,
    );
    for (const violation of violations) {
      console.error(
        `[${violation.rule}] ${violation.file}\n  ${violation.detail}\n`,
      );
    }
    Deno.exit(1);
  }
  console.log("UI Specification check passed with 0 violations.");
}
