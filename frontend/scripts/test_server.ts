import { join } from "@std/path";

const root = new URL("../", import.meta.url).pathname;
const fixture = await Deno.makeTempDir({ prefix: "paisa-browser-" });
const binary = join(
  fixture,
  Deno.build.os === "windows" ? "paisa.exe" : "paisa",
);
const children: Deno.ChildProcess[] = [];
let stopping = false;

async function run(command: string, args: string[], cwd = root) {
  const status = await new Deno.Command(command, {
    args,
    cwd,
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!status.success) {
    throw new Error(`${command} failed with exit code ${status.code}`);
  }
}

async function waitForPort(port: number, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
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

async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  await Promise.allSettled(children.map((child) => child.status));
  await Deno.remove(fixture, { recursive: true });
  Deno.exit(code);
}

for (
  const signal of Deno.build.os === "windows"
    ? ["SIGINT"] as const
    : ["SIGINT", "SIGTERM"] as const
) {
  Deno.addSignalListener(signal, () => void stop(0));
}

try {
  await Deno.copyFile(
    join(root, "tests/fixture/browser/main.ledger"),
    join(fixture, "main.ledger"),
  );
  await Deno.copyFile(
    join(root, "tests/fixture/browser/paisa.yaml"),
    join(fixture, "paisa.yaml"),
  );
  // Start browser tests from the committed fixture state. This keeps visual
  // baselines deterministic even when the optional Ledger CLI is unavailable.
  await Deno.copyFile(
    join(root, "tests/fixture/browser/paisa.db"),
    join(fixture, "paisa.db"),
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
  await Deno.mkdir(join(fixture, "sheets"), { recursive: true });
  await Deno.copyFile(
    join(root, "tests/fixture/browser/sheets/overview.paisa"),
    join(fixture, "sheets/overview.paisa"),
  );
  // Source checkouts intentionally contain only a release placeholder for the
  // bundled Ledger binary. Let editor validation succeed in browser tests,
  // while making synchronization fail before it can replace fixture DB rows.
  const ledgerStub = join(fixture, "ledger");
  await Deno.writeTextFile(
    ledgerStub,
    '#!/bin/sh\ncase " $* " in *" balance "*) exit 0;; *) exit 1;; esac\n',
    { mode: 0o750 },
  );
  await run(Deno.execPath(), ["task", "build"]);
  await run("go", ["build", "-o", binary, "."], join(root, "../backend"));

  const backend = new Deno.Command(binary, {
    args: [
      "--config",
      join(fixture, "paisa.yaml"),
      "serve",
      "--port",
      "7500",
      "--now",
      "2022-02-07",
    ],
    cwd: fixture,
    env: {
      TZ: "UTC",
      PATH: `${fixture}:${Deno.env.get("PATH") ?? ""}`,
    },
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  children.push(backend);
  await waitForPort(7500);

  const frontend = new Deno.Command(Deno.execPath(), {
    args: [
      "task",
      "preview",
      "--host",
      "0.0.0.0",
      "--port",
      "5173",
      "--strictPort",
    ],
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  children.push(frontend);
  await waitForPort(5173);

  const failed = await Promise.race(children.map((child) => child.status));
  await stop(failed.code || 1);
} catch (error) {
  console.error(error);
  await stop(1);
}
