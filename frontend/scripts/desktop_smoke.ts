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

// Keep the app's output so a failure says why, not only that it failed.
let output = "";
const collect = async (stream: ReadableStream<Uint8Array>) => {
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    output += decoder.decode(chunk, { stream: true });
  }
};
const collected = [collect(child.stdout), collect(child.stderr)];

// A cold start on a CI runner can take far longer than a local one.
const STARTUP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 500;

async function exists(path: string) {
  try {
    await fs.stat(path);
    return true;
  } catch (_error) {
    return false;
  }
}

try {
  const database = join(fixture, "paisa.db");
  let exitCode: number | undefined;
  child.exited.then((code) => {
    exitCode = code;
  });

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let ready = false;
  while (Date.now() < deadline) {
    if (await exists(database)) {
      ready = true;
      break;
    }
    if (exitCode !== undefined) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  if (!ready) {
    const reason =
      exitCode !== undefined
        ? `exited early with code ${exitCode}`
        : `stayed alive but did not create ${database} within ${STARTUP_TIMEOUT_MS / 1000}s`;
    child.kill();
    await child.exited;
    // A helper process can keep the pipes open after the app is killed.
    await Promise.race([
      Promise.allSettled(collected),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    throw new Error(
      `${basename(executable)} ${reason}\n--- app output ---\n${output || "(none)"}`,
    );
  }
  console.log(
    `Desktop smoke passed for ${basename(dirname(executable))}/${basename(
      executable,
    )}`,
  );
} finally {
  try {
    child.kill();
  } catch (_error) {
    // Child may have already exited
  }
  await child.exited;
  await fs.rm(fixture, { recursive: true, force: true });
}
