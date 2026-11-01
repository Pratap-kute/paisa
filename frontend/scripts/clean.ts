import fs from "node:fs/promises";

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
    await fs.rm(target, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to remove ${target}:`, error);
  }
}
