async function waitForPort(
  port: number,
  serverStatus: Promise<Deno.CommandStatus>,
  timeout = 120_000,
) {
  let isDone = false;
  serverStatus.then((status) => {
    isDone = true;
    if (!status.success) {
      throw new Error(`Test server exited early with code ${status.code}`);
    }
  });

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (isDone) {
      throw new Error(`Test server exited before port ${port} became ready`);
    }
    try {
      const connection = await Deno.connect({ hostname: "127.0.0.1", port });
      connection.close();
      return;
    } catch (error) {
      if (!(error instanceof Deno.errors.ConnectionRefused)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timed out waiting for port ${port}`);
}

const server = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "--allow-env",
    "--allow-net",
    "--allow-read",
    "--allow-run",
    "--allow-write",
    "scripts/test_server.ts",
  ],
  stdin: "null",
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

try {
  await waitForPort(5173, server.status);
  const status = await new Deno.Command(Deno.execPath(), {
    args: ["task", "playwright", "test", ...Deno.args],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  Deno.exitCode = status.code;
} finally {
  try {
    server.kill("SIGTERM");
  } catch (_error) {
    // Child process may already have terminated
  }
  await server.status;
}
