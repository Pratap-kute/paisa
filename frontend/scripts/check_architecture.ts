import {
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "@std/path";

export interface ArchitectureViolation {
  source: string;
  imported: string;
  rule: string;
}

const SOURCE_EXTENSIONS = [".ts", ".js", ".svelte"];

export function extractStaticImports(source: string): string[] {
  const imports = new Set<string>();
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.add(match[1]);
  }
  return [...imports];
}

function relativeToFrontend(path: string, frontendRoot: string): string {
  return relative(frontendRoot, path).replaceAll("\\", "/");
}

function resolveLocalImport(
  source: string,
  imported: string,
  frontendRoot: string,
): string | null {
  if (imported.startsWith("$lib/")) {
    return resolve(frontendRoot, "src/lib", imported.slice(5));
  }
  if (imported.startsWith(".")) {
    return resolve(source, "..", imported);
  }
  if (imported.startsWith("src/")) return resolve(frontendRoot, imported);
  return null;
}

export function classifyViolation(
  sourcePath: string,
  imported: string,
  frontendRoot: string,
): ArchitectureViolation | null {
  const source = relativeToFrontend(resolve(sourcePath), frontendRoot);
  const targetPath = resolveLocalImport(
    resolve(sourcePath),
    imported,
    frontendRoot,
  );
  const target = targetPath
    ? relativeToFrontend(targetPath, frontendRoot)
    : imported;
  const inDomain = source.startsWith("src/lib/domain/");
  const inShared = source.startsWith("src/lib/shared/");
  const inFeature = source.startsWith("src/lib/features/");
  const inApi = source.startsWith("src/lib/api/");
  const inGenerated = source.startsWith("src/lib/generated/");

  if (
    inDomain && (
      imported === "svelte" || imported.startsWith("svelte/") ||
      imported.startsWith("$app/") || target.endsWith(".svelte") ||
      target.startsWith("src/routes/") ||
      target.startsWith("src/lib/features/") ||
      target.startsWith("src/lib/api/") ||
      target.startsWith("src/lib/shared/ui/") ||
      target.startsWith("src/lib/shared/layout/")
    )
  ) {
    return {
      source,
      imported,
      rule: "domain must remain framework and application-layer independent",
    };
  }
  if (
    inShared &&
    (target.startsWith("src/lib/features/") || target.startsWith("src/routes/"))
  ) {
    return {
      source,
      imported,
      rule: "shared must not depend on features or routes",
    };
  }
  if (inFeature && target.startsWith("src/routes/")) {
    return { source, imported, rule: "features must not depend on routes" };
  }
  if (
    inApi &&
    (target.startsWith("src/routes/") || target.startsWith("src/lib/features/"))
  ) {
    return {
      source,
      imported,
      rule: "api must not depend on routes or feature implementations",
    };
  }
  if (
    inGenerated &&
    (target.startsWith("src/routes/") || target.startsWith("src/lib/features/"))
  ) {
    return {
      source,
      imported,
      rule:
        "generated output must not depend on application features or routes",
    };
  }
  return null;
}

async function* sourceFiles(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = join(root, entry.name);
    if (entry.isDirectory) yield* sourceFiles(path);
    else if (SOURCE_EXTENSIONS.includes(extname(entry.name))) yield path;
  }
}

function localImportExists(
  source: string,
  imported: string,
  frontendRoot: string,
): boolean {
  if (imported === "./$types" || imported.endsWith("/$types")) return true;
  const target = resolveLocalImport(source, imported, frontendRoot);
  if (!target) return true;
  if (isAbsolute(imported) || relative(frontendRoot, target).startsWith("..")) {
    return false;
  }
  const candidates = extname(target)
    ? [target, target + ".ts", target + ".js"]
    : [
      target,
      ...SOURCE_EXTENSIONS.map((extension) => target + extension),
      ...SOURCE_EXTENSIONS.map((extension) =>
        join(target, "index" + extension)
      ),
    ];
  return candidates.some((candidate) => {
    try {
      return Deno.statSync(candidate).isFile;
    } catch {
      return false;
    }
  });
}

export async function checkArchitecture(
  frontendRoot = Deno.cwd(),
): Promise<ArchitectureViolation[]> {
  frontendRoot = normalize(resolve(frontendRoot));
  const violations: ArchitectureViolation[] = [];
  for await (const source of sourceFiles(join(frontendRoot, "src"))) {
    const text = await Deno.readTextFile(source);
    for (const imported of extractStaticImports(text)) {
      if (!localImportExists(source, imported, frontendRoot)) {
        violations.push({
          source: relativeToFrontend(source, frontendRoot),
          imported,
          rule: "local import must resolve inside the frontend source tree",
        });
        continue;
      }
      const violation = classifyViolation(source, imported, frontendRoot);
      if (violation) violations.push(violation);
    }
  }
  return violations;
}

if (import.meta.main) {
  const violations = await checkArchitecture();
  if (violations.length) {
    console.error(
      `Architecture check failed with ${violations.length} violation(s):`,
    );
    for (const violation of violations) {
      console.error(
        `- ${violation.source}: ${violation.imported}\n  ${violation.rule}`,
      );
    }
    Deno.exit(1);
  }
  console.log("Architecture check passed");
}
