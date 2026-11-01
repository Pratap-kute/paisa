import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const includeFrontend = process.argv.includes("--frontend");
const fixedDate = process.argv.includes("--now");
const ignoredDirectories = new Set([
  ".git",
  ".svelte-kit",
  "graphify-out",
  "node_modules",
  "backend/web/static",
]);

async function ensurePortAvailable(port: number, service: string): Promise<void> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `${service} port ${port} is already in use. ` +
            "Stop the existing development server with Ctrl+C, then run make develop again.",
        );
        process.exit(1);
      }
      resolve();
    });
    server.once("listening", () => {
      server.close(() => resolve());
    });
    server.listen(port, "0.0.0.0");
  });
}

await ensurePortAvailable(7500, "Backend");
if (includeFrontend) await ensurePortAvailable(5173, "Frontend");

let backend: ReturnType<typeof Bun.spawn> | undefined;
let frontend: ReturnType<typeof Bun.spawn> | undefined;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paisa-dev-"));
const backendBinary = path.join(
  tempDir,
  process.platform === "win32" ? "backend.exe" : "backend",
);
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let restarting = false;
let shuttingDown = false;

async function startBackend() {
  const buildProc = Bun.spawn(["go", "build", "-o", backendBinary, "."], {
    cwd: "backend",
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const buildCode = await buildProc.exited;
  if (buildCode !== 0) {
    await shutdown(buildCode);
    return;
  }

  const args = [backendBinary, "serve"];
  if (fixedDate) args.push("--now", "2022-02-07");

  backend = Bun.spawn(args, {
    env: {
      ...process.env,
      ...(fixedDate ? { TZ: "UTC" } : {}),
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const current = backend;
  current.exited.then((code) => {
    if (!restarting && !shuttingDown && backend === current) {
      void shutdown(code);
    }
  });
}

function startFrontend() {
  frontend = Bun.spawn(["bun", "run", "dev"], {
    cwd: "frontend",
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  frontend.exited.then((code) => {
    if (!shuttingDown) void shutdown(code);
  });
}

async function stop(child: ReturnType<typeof Bun.spawn> | undefined) {
  if (!child) return;
  try {
    child.kill("SIGTERM");
  } catch (_error) {
    // Already terminated
  }
  await child.exited;
}

async function restartBackend() {
  restarting = true;
  await stop(backend);
  await startBackend();
  restarting = false;
}

async function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (restartTimer !== undefined) clearTimeout(restartTimer);
  await Promise.allSettled([stop(backend), stop(frontend)]);
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_error) {
    // Ignore cleanup error
  }
  process.exit(code);
}

function shouldRestart(filename: string) {
  const normalized = filename.replaceAll("\\", "/");
  if (
    [...ignoredDirectories].some((dir) =>
      normalized.includes(`/${dir}/`) || normalized.endsWith(`/${dir}`)
    )
  ) return false;
  return (normalized.endsWith(".go") || normalized.endsWith(".json"));
}

const terminationSignals = process.platform === "win32"
  ? (["SIGINT"] as const)
  : (["SIGINT", "SIGTERM"] as const);
for (const signal of terminationSignals) {
  process.on(signal, () => void shutdown(0));
}

if (includeFrontend) startFrontend();
await startBackend();

try {
  fs.watch("./backend", { recursive: true }, (_eventType, filename) => {
    if (shuttingDown || !filename || !shouldRestart(filename)) return;
    if (restartTimer !== undefined) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      restartTimer = undefined;
      void restartBackend();
    }, 2_000);
  });
} catch (error) {
  console.warn("File watching not supported or failed:", error);
}
