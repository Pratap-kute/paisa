import { describe, test, expect } from "bun:test";
import fs from "node:fs";
import { format } from "./journal";

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
