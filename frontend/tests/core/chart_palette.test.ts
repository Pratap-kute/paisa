import { describe, expect, it } from "vitest";
import { chartColors, generateColorScheme } from "$lib/shared/theme/chartPalette";

describe("Paisa chart palette", () => {
  it("preserves semantic financial colors", () => {
    const color = generateColorScheme(["Income", "Expenses"]);
    expect(color("Income")).toBe(chartColors.income);
    expect(color("Expenses")).toBe(chartColors.expenses);
  });

  it("preserves fixed categorical palettes", () => {
    const color = generateColorScheme(["Housing", "Food", "Travel"]);
    expect([color("Housing"), color("Food"), color("Travel")]).toEqual([
      "#66c2a5",
      "#fc8d62",
      "#8da0cb",
    ]);
  });

  it("reproduces the legacy large-domain sinebow palette", () => {
    const keys = Array.from({ length: 13 }, (_, index) => `k${index}`);
    const color = generateColorScheme(keys);
    expect(keys.map(color)).toEqual([
      "#df6358",
      "#d88b4d",
      "#c2bd5a",
      "#9ee85d",
      "#80f870",
      "#79e69b",
      "#8db3b2",
      "#6380bf",
      "#5b4ad7",
      "#7d34cb",
      "#a940a6",
      "#cb517e",
      "#df6358",
    ]);
  });

  it("is repeatable and gives unknown keys a stable fallback", () => {
    const domain = ["Housing", "Food", "Travel", "Utilities"];
    const first = generateColorScheme(domain);
    const second = generateColorScheme([...domain]);
    expect(domain.map(first)).toEqual(domain.map(second));
    expect(first("Unlisted")).toBe(first("Unlisted"));
    expect(first(" unlisted ")).toBe(first("Unlisted"));
  });

  it("returns the neutral color for an empty palette", () => {
    expect(generateColorScheme([])("Anything")).toBe(chartColors.neutral);
  });
});
