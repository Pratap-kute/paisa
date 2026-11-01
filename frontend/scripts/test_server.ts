import { fileURLToPath } from "node:url";
import { join } from "node:path";
import fs from "node:fs/promises";
import net from "node:net";
import { copyFixtureSourceToTemp } from "../tests/fixture_utils.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceDir = join(root, "tests/fixture/browser");
const backendPort = Number(process.env.PAISA_E2E_BACKEND_PORT ?? 7500);
const frontendPort = Number(process.env.PAISA_E2E_FRONTEND_PORT ?? 5173);
const fixture = await copyFixtureSourceToTemp(sourceDir);
const binary = join(
  fixture,
  process.platform === "win32" ? "paisa.exe" : "paisa",
);
const children: ReturnType<typeof Bun.spawn>[] = [];
let stopping = false;

async function run(
  command: string,
  args: string[],
  cwd = root,
  env: Record<string, string> = {},
) {
  const proc = Bun.spawn([command, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${command} failed with exit code ${code}`);
  }
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

async function waitForPort(port: number, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await checkPort(port);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for port ${port}`);
}

async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch (_error) {
      // Child might have already exited
    }
  }
  await Promise.allSettled(children.map((child) => child.exited));
  try {
    await fs.rm(fixture, { recursive: true, force: true });
  } catch (_error) {
    // Ignore cleanup error
  }
  process.exit(code);
}

const signals =
  process.platform === "win32"
    ? (["SIGINT"] as const)
    : (["SIGINT", "SIGTERM"] as const);

for (const signal of signals) {
  process.on(signal, () => void stop(0));
}

try {
  // Browser tests must exercise the current working tree, not a static bundle
  // left behind by an earlier run.
  await run("bun", ["run", "build"], root, {
    VITE_PAISA_E2E_DEV_UI: "true",
  });
  await run("go", ["build", "-o", binary, "."], join(root, "../backend"));
  if (process.env.PAISA_SHOWCASE_CAPTURE === "true") {
    const journalPath = join(fixture, "main.ledger");
    const journal = await fs.readFile(journalPath, "utf-8");
    await fs.writeFile(
      journalPath,
      journal +
        "\n2021/11/15 Demo streaming\n" +
        "    Expenses:Entertainment                      499 INR\n" +
        "    Assets:Checking                           -499 INR\n" +
        "\n2021/12/15 Demo streaming\n" +
        "    Expenses:Entertainment                      499 INR\n" +
        "    Assets:Checking                           -499 INR\n" +
        "\n2022/01/15 Demo streaming\n" +
        "    Expenses:Entertainment                      499 INR\n" +
        "    Assets:Checking                           -499 INR\n",
    );
    const configPath = join(fixture, "paisa.yaml");
    const config = await fs.readFile(configPath, "utf-8");
    await fs.writeFile(
      configPath,
      config +
        "\nprediction:\n" +
        "  merchant_rules:\n" +
        "    - merchant: Demo groceries\n" +
        "      account: Expenses:Food\n",
    );
  }
  await run(
    binary,
    [
      "--config",
      join(fixture, "paisa.yaml"),
      "--now",
      "2022-02-07",
      "update",
      // Browser fixtures contain their own prices. Keep this setup deterministic
      // and local: do not fetch live prices, portfolios, or taxation data.
      "--journal",
    ],
    fixture,
  );

  // Portfolio holdings normally come from an external provider, so journal
  // synchronization cannot recreate them in CI. Seed a small deterministic
  // portfolio to keep the assets-analysis browser fixture self-contained.
  await run("sqlite3", [
    join(fixture, "paisa.db"),
    `DELETE FROM portfolios;
     INSERT INTO portfolios
       (commodity_type, parent_commodity_id, security_id, security_name,
        security_type, security_rating, security_industry, percentage)
     VALUES
       ('mutualfund', '120716', 'INE001', 'Reliance Industries', 'equity', '', 'Energy', '24'),
       ('mutualfund', '120716', 'INE002', 'HDFC Bank', 'equity', '', 'Financial Services', '22'),
       ('mutualfund', '120716', 'INE003', 'Infosys', 'equity', '', 'Technology', '18'),
       ('mutualfund', '120716', 'INE004', 'Bharti Airtel', 'equity', '', 'Telecommunication', '16'),
       ('mutualfund', '120716', 'GOI2032', 'Government Bond 2032', 'debt', 'Sovereign', 'Government', '12'),
       ('mutualfund', '120716', 'CORPAAA', 'AAA Corporate Bond', 'debt', 'AAA', 'Financial Services', '8');`,
  ]);
  // Source checkouts intentionally contain only a release placeholder for the
  // bundled Ledger binary. Let editor validation succeed in browser tests,
  // while making synchronization fail before it can replace fixture DB rows.
  const ledgerStub = join(fixture, "ledger");
  await fs.writeFile(
    ledgerStub,
    '#!/bin/sh\ncase " $* " in *" balance "*) exit 0;; *) exit 1;; esac\n',
    { mode: 0o750 },
  );

  const backend = Bun.spawn(
    [
      binary,
      "--config",
      join(fixture, "paisa.yaml"),
      "serve",
      "--port",
      String(backendPort),
      "--now",
      "2022-02-07",
    ],
    {
      cwd: fixture,
      env: {
        ...process.env,
        TZ: "UTC",
        PATH: `${fixture}:${process.env.PATH ?? ""}`,
      },
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  children.push(backend);
  await waitForPort(backendPort);

  const frontend = Bun.spawn(
    [
      "bun",
      "run",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(frontendPort),
      "--strictPort",
    ],
    {
      cwd: root,
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  children.push(frontend);
  await waitForPort(frontendPort);

  const failedCode = await Promise.race(children.map((child) => child.exited));
  await stop(failedCode || 1);
} catch (error) {
  console.error(error);
  await stop(1);
}
