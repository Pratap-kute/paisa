import net from "node:net";

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
}

async function waitForPort(
  port: number,
  serverProc: ReturnType<typeof Bun.spawn>,
  timeout = 120_000,
) {
  let isDone = false;
  serverProc.exited.then((code) => {
    isDone = true;
    if (code !== 0) {
      throw new Error(`Test server exited early with code ${code}`);
    }
  });

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (isDone) {
      throw new Error(`Test server exited before port ${port} became ready`);
    }
    const ready = await checkPort(port);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for port ${port}`);
}

const server = Bun.spawn(["bun", "run", "scripts/test_server.ts"], {
  stdin: "ignore",
  stdout: "inherit",
  stderr: "inherit",
});

try {
  const port = Number(process.env.PAISA_E2E_FRONTEND_PORT ?? 5173);
  await waitForPort(port, server);
  const userArgs = process.argv.slice(2);
  const status = await Bun.spawn(["bun", "x", "playwright", "test", ...userArgs], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, PAISA_E2E_DEV_UI: "1" },
  }).exited;
  process.exitCode = status;
} finally {
  try {
    server.kill("SIGTERM");
  } catch (_error) {
    // Child process may already have terminated
  }
  await server.exited;
}
