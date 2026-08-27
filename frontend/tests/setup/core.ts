import "./setup.ts";
import dayjs from "dayjs";
import { parentPort } from "node:worker_threads";
import { afterEach, beforeEach, vi } from "vitest";
import { setNow } from "$lib/domain/time";

// Deno exposes parentPort.removeAllListeners for Node compatibility, but the
// implementation currently throws. Vitest calls it while tearing down its
// thread pool, after all tests have passed, which makes the run fail.
if (parentPort) {
  Object.defineProperty(parentPort, "removeAllListeners", {
    configurable: true,
    value: () => parentPort,
  });
}

beforeEach(() => {
  setNow(dayjs());
});

afterEach(() => {
  vi.unstubAllGlobals();
});
