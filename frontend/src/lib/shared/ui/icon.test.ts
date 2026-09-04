import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import { hasIcon, iconGlyphOr } from "./icon.ts";

describe("configured icons", () => {
  test("recognizes valid MDI symbols and the legacy land alias", () => {
    expect(hasIcon("mdi:land-plots")).toBe(true);
    expect(hasIcon("mdi:land-plants")).toBe(true);
  });

  test("maps the legacy land name to the bundled land-plots glyph", () => {
    expect(iconGlyphOr("mdi:land-plants"))
      .toBe(iconGlyphOr("mdi:land-plots"));
  });

  test("uses a visible fallback for other invalid configured symbols", () => {
    expect(iconGlyphOr("mdi:not-a-real-icon"))
      .toBe(iconGlyphOr("fa6-solid:bullseye"));
  });
});
