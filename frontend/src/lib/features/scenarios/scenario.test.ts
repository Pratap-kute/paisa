import { expect } from "@std/expect";
const assertEquals = (a: unknown, b: unknown) => expect(a).toEqual(b);
import { scenarioSeries } from "./scenario.ts";

Deno.test("scenario privacy strips chart and tooltip amounts", () => {
  const result = {
    baseline: { points: [{ month: "2026-10", cash: 12345 }] },
    scenario: { points: [{ month: "2026-10", cash: -54321 }] },
  };
  const hidden = scenarioSeries(result, "cash", true);
  assertEquals(hidden.points[0].values, { baseline: 0, scenario: 0 });
  assertEquals(hidden.points[0].tooltipRows, [
    ["Baseline", 0],
    ["Scenario", 0],
    ["Difference", 0],
  ]);
  const shown = scenarioSeries(result, "cash");
  assertEquals(shown.points[0].tooltipRows, [["Baseline", 12345], [
    "Scenario",
    -54321,
  ], ["Difference", -66666]]);
  assertEquals(shown.series[0].dashed, true);
});
