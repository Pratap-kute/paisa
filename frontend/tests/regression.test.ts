import { fromFileUrl, join } from "@std/path";
import { describe, it as test } from "@std/testing/bdd";
import { expect } from "@std/expect";
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
  const regenerate = Deno.env.get("REGENERATE") === "true";
  const normalized = withoutGeneratedIds(data);

  let exists = true;
  try {
    Deno.statSync(filename);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) exists = false;
    else throw error;
  }

  if (exists && !regenerate) {
    const current = JSON.parse(Deno.readTextFileSync(filename));
    expect(normalized).toEqual(withoutGeneratedIds(current));
    return;
  }

  Deno.writeTextFileSync(filename, JSON.stringify(normalized, null, 2));
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

async function waitForPort(port: number, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const connection = await Deno.connect({
        hostname: "127.0.0.1",
        port,
      });
      connection.close();
      return;
    } catch (error) {
      if (
        !(error instanceof Deno.errors.ConnectionRefused) &&
        !(error instanceof Deno.errors.ConnectionReset) &&
        !(error instanceof Deno.errors.ConnectionAborted) &&
        !(error instanceof Deno.errors.NotConnected)
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timed out waiting for port ${port}`);
}

function findPaisaBinary(): string {
  const frontendDir = fromFileUrl(new URL("../", import.meta.url));
  const backendBinary = join(frontendDir, "../backend/paisa");
  try {
    Deno.statSync(backendBinary);
    return backendBinary;
  } catch (_) {
    return join(frontendDir, "paisa");
  }
}

async function check(baselineDir: string, fixtureName: string) {
  const workDir = await copyFixtureSourceToTemp(baselineDir);
  const port = fixturePort(fixtureName);
  const baseUrl = `http://localhost:${port}`;
  const request = createRequest(baseUrl);

  const command = new Deno.Command(findPaisaBinary(), {
    args: [
      "--config",
      join(workDir, "paisa.yaml"),
      "--port",
      port.toString(),
      "--now",
      "2022-02-07",
      "serve",
    ],
    cwd: workDir,
    env: { TZ: "UTC" },
  });
  const child = command.spawn();
  try {
    await waitForPort(port);
    await verifyApi(baselineDir, request);
  } finally {
    child.kill("SIGTERM");
    await child.status;
    await Deno.remove(workDir, { recursive: true });
  }
}

describe("regression", () => {
  Array.from(Deno.readDirSync(fixture)).forEach(({ name: dir }) => {
    test(dir, async () => {
      const baselineDir = join(fixture, dir);
      await check(baselineDir, dir);
    });
  });
});
