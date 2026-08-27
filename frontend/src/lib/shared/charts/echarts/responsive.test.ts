import { expect } from "@std/expect";
import { responsiveChartOption } from "./responsive";

Deno.test("responsiveChartOption uses root media options without implying a timeline", () => {
  const desktop = { grid: { left: 24 }, series: [{ type: "line" }] };
  const compact = { grid: { left: 8 } };

  const option = responsiveChartOption(desktop, compact);

  expect(option).toEqual({
    ...desktop,
    media: [{ query: { maxWidth: 639 }, option: compact }],
  });
  expect(option).not.toHaveProperty("baseOption");
  expect(option).not.toHaveProperty("timeline");
  expect(desktop).toEqual({
    grid: { left: 24 },
    series: [{ type: "line" }],
  });
});
