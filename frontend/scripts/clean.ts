const targets = [
  ".svelte-kit",
  ".vite",
  "node_modules/.vite",
  "../backend/web/static",
  "coverage",
  "playwright-report",
  "test-results",
];

for (const target of targets) {
  try {
    await Deno.remove(target, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.error(`Failed to remove ${target}:`, error);
    }
  }
}
