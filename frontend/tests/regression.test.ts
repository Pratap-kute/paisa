import { join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import net from "node:net";
import { describe, test, expect } from "bun:test";
import {
  copyFixtureSourceToTemp,
  fixturePort,
  withoutGeneratedIds,
} from "./fixture_utils.ts";

const fixture = "tests/fixture";

function createRequest(baseUrl: string) {
  return async function request(route: string, init?: RequestInit) {
    const response = await fetch(new URL(route, baseUrl), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!response.ok) {
      throw new Error(
        `${init?.method || "GET"} ${route} failed: ${response.status}`,
      );
    }
    return await response.json();
  };
}

async function recordAndVerify(
  baselineDir: string,
  request: ReturnType<typeof createRequest>,
  route: string,
  name: string,
) {
  const data = await request(route);

  const filename = join(baselineDir, name + ".json");
  const regenerate = process.env.REGENERATE === "true";
  const normalized = withoutGeneratedIds(data);

  const exists = fsSync.existsSync(filename);

  if (exists && !regenerate) {
    const current = JSON.parse(fsSync.readFileSync(filename, "utf-8"));
    expect(normalized).toEqual(withoutGeneratedIds(current));
    return;
  }

  fsSync.writeFileSync(filename, JSON.stringify(normalized, null, 2));
}

async function verifyApi(
  baselineDir: string,
  request: ReturnType<typeof createRequest>,
) {
  const { success } = await request("/api/sync", {
    method: "POST",
    body: JSON.stringify({ journal: true }),
  });
  expect(success).toBe(true);

  await recordAndVerify(baselineDir, request, "/api/dashboard", "dashboard");
  await recordAndVerify(baselineDir, request, "/api/cash_flow", "cash_flow");
  await recordAndVerify(
    baselineDir,
    request,
    "/api/income_statement",
    "income_statement",
  );
  await recordAndVerify(baselineDir, request, "/api/expense", "expense");
  await recordAndVerify(baselineDir, request, "/api/recurring", "recurring");
  await recordAndVerify(baselineDir, request, "/api/budget", "budget");
  await recordAndVerify(
    baselineDir,
    request,
    "/api/assets/balance",
    "assets_balance",
  );
  await recordAndVerify(baselineDir, request, "/api/networth", "networth");
  await recordAndVerify(baselineDir, request, "/api/investment", "investment");
  await recordAndVerify(baselineDir, request, "/api/gain", "gain");
  await recordAndVerify(
    baselineDir,
    request,
    "/api/investment/performance?drivers=true&timeline=true",
    "investment_performance",
  );
  await recordAndVerify(baselineDir, request, "/api/allocation", "allocation");
  await recordAndVerify(
    baselineDir,
    request,
    "/api/liabilities/balance",
    "liabilities_balance",
  );
  await recordAndVerify(
    baselineDir,
    request,
    "/api/liabilities/repayment",
    "liabilities_repayment",
  );
  await recordAndVerify(
    baselineDir,
    request,
    "/api/liabilities/interest",
    "liabilities_interest",
  );
  await recordAndVerify(baselineDir, request, "/api/income", "income");
  await recordAndVerify(
    baselineDir,
    request,
    "/api/transaction",
    "transaction",
  );
  await recordAndVerify(baselineDir, request, "/api/editor/files", "files");
  await recordAndVerify(baselineDir, request, "/api/ledger", "ledger");
  await recordAndVerify(baselineDir, request, "/api/price", "price");
  await recordAndVerify(baselineDir, request, "/api/diagnosis", "diagnosis");
  await recordAndVerify(baselineDir, request, "/api/config", "config");
}

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

async function waitForPort(port: number, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await checkPort(port);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for port ${port}`);
}

function findPaisaBinary(): string {
  const frontendDir = fileURLToPath(new URL("../", import.meta.url));
  const backendBinary = join(frontendDir, "../backend/paisa");
  if (fsSync.existsSync(backendBinary)) {
    return backendBinary;
  }
  return join(frontendDir, "paisa");
}

async function check(baselineDir: string, fixtureName: string) {
  const workDir = await copyFixtureSourceToTemp(baselineDir);
  const port = fixturePort(fixtureName);
  const baseUrl = `http://localhost:${port}`;
  const request = createRequest(baseUrl);

  const child = Bun.spawn([
    findPaisaBinary(),
    "--config",
    join(workDir, "paisa.yaml"),
    "--port",
    port.toString(),
    "--now",
    "2022-02-07",
    "serve",
  ], {
    cwd: workDir,
    env: { ...process.env, TZ: "UTC" },
    stdout: "ignore",
    stderr: "ignore",
  });

  try {
    await waitForPort(port);
    await verifyApi(baselineDir, request);
  } finally {
    try {
      child.kill("SIGTERM");
    } catch (_error) {
      // Ignore
    }
    await child.exited;
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

describe("regression", () => {
  const entries = fsSync.readdirSync(fixture, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    test(entry.name, async () => {
      const baselineDir = join(fixture, entry.name);
      await check(baselineDir, entry.name);
    });
  }
});
