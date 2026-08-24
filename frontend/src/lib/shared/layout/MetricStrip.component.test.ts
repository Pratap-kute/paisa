import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import MetricStrip from "./MetricStrip.svelte";

test("renders metric strip with auto and explicit column classes", () => {
  const { container, unmount } = render(MetricStrip, {
    cols: 4,
  });

  const strip = container.querySelector(".paisa-metric-strip");
  expect(strip).toBeInTheDocument();
  expect(strip).toHaveClass("paisa-metric-strip-cols-4");
  unmount();
});
