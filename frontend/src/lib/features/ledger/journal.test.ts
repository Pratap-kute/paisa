import { describe, test, expect, beforeEach } from "bun:test";
import fs from "node:fs";
import { format } from "./journal";

// The formatter reads the global USER_CONFIG, which other test files replace.
// Pin the default alignment so this file does not depend on file order.
beforeEach(() => {
  if (typeof globalThis.USER_CONFIG !== "undefined") {
    globalThis.USER_CONFIG.amount_alignment_column = 52;
  }
});

function readFixture(name: string) {
  try {
    return fs.readFileSync(`../fixture/${name}`, "utf-8");
  } catch (_) {
    return fs.readFileSync(`fixture/${name}`, "utf-8");
  }
}

describe("journal", () => {
  test("format", () => {
    expect(format(readFixture("unformatted.ledger"))).toBe(
      readFixture("formatted.ledger"),
    );
  });
});
