import { describe, expect, it } from "vitest";
import {
  commitParseOutcome,
  displayCell,
} from "$lib/importing/import_commit";

describe("displayCell", () => {
  it("keeps zero and empty string instead of collapsing them", () => {
    expect(displayCell(0)).toBe(0 as unknown as string);
    expect(displayCell("")).toBe("");
    expect(displayCell(null)).toBe("");
    expect(displayCell(undefined)).toBe("");
  });
});

describe("commitParseOutcome", () => {
  it("commits data only on success", () => {
    expect(commitParseOutcome("ok.csv", { data: [["a", 0]] })).toEqual({
      ok: true,
      fileName: "ok.csv",
      data: [["a", 0]],
    });
  });

  it("does not keep source rows when parse reports an error", () => {
    expect(
      commitParseOutcome("bad.csv", { error: "invalid", data: [["stale"]] }),
    ).toEqual({
      ok: false,
      fileName: "bad.csv",
      error: "invalid",
    });
  });

  it("treats thrown parse failures as a failed commit", () => {
    expect(commitParseOutcome("boom.csv", null, "Error parsing file")).toEqual({
      ok: false,
      fileName: "boom.csv",
      error: "Error parsing file",
    });
  });
});
