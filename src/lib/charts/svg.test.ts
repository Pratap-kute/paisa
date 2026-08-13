import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { svgRectSpan } from "./svg";

describe("svgRectSpan", () => {
  it("preserves a positive SVG rectangle", () => {
    expect(svgRectSpan(10, 25)).toEqual({ x: 10, width: 15 });
  });

  it("normalizes a negative stacked value", () => {
    expect(svgRectSpan(25, 10)).toEqual({ x: 10, width: 15 });
  });

  it("allows an empty rectangle", () => {
    expect(svgRectSpan(10, 10)).toEqual({ x: 10, width: 0 });
  });
});
