import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";

const configured = process.env.PAISA_DESKTOP_BINARY;
if (!configured) {
  throw new Error(
    "PAISA_DESKTOP_BINARY must point to the packaged Wails executable",
  );
}
const executable = fsSync.realpathSync(configured);
const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = await fs.mkdtemp(join(os.tmpdir(), "paisa-desktop-"));
await fs.copyFile(
  join(root, "tests/fixture/inr/main.ledger"),
  join(fixture, "main.ledger"),
);
await fs.copyFile(
  join(root, "tests/fixture/inr/paisa.yaml"),
  join(fixture, "paisa.yaml"),
);

const child = Bun.spawn([executable], {
  cwd: fixture,
  env: {
    ...process.env,
    PAISA_CONFIG: join(fixture, "paisa.yaml"),
    TZ: "UTC",
    PAISA_GPU_POLICY: "never",
  },
  stdout: "pipe",
  stderr: "pipe",
});

try {
  const result = await Promise.race([
    child.exited.then((code) => ({ exited: true, code })),
    new Promise<{ exited: false }>((resolve) =>
      setTimeout(() => resolve({ exited: false }), 10_000)
    ),
  ]);
  if (result.exited) {
    throw new Error(
      `${basename(executable)} exited early with code ${result.code}`,
    );
  }
  const database = join(fixture, "paisa.db");
  try {
    await fs.stat(database);
  } catch (_error) {
    throw new Error(
      `Desktop app stayed alive but did not create ${database}`,
    );
  }
  console.log(
    `Desktop smoke passed for ${basename(dirname(executable))}/${
      basename(executable)
    }`,
  );
} finally {
  try {
    child.kill("SIGTERM");
  } catch (_error) {
    // Child may have already exited
  }
  await child.exited;
  await fs.rm(fixture, { recursive: true, force: true });
}
