import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import ChartFrame from "./ChartFrame.svelte";

test("renders chart frame with semantic type and size class", () => {
  const { container, unmount } = render(ChartFrame, {
    type: "timeline",
    title: "Monthly Cash Flow",
  });

  const frame = container.querySelector(".paisa-chart-frame");
  expect(frame).toBeInTheDocument();
  expect(frame).toHaveClass("paisa-chart-type-timeline");
  expect(container.querySelector(".paisa-chart-frame-title")).toHaveTextContent("Monthly Cash Flow");
  unmount();
});

test("renders empty state message when empty prop is true", () => {
  const { container, unmount } = render(ChartFrame, {
    size: "standard",
    empty: true,
    emptyMessage: "No data available",
  });

  expect(container.querySelector(".paisa-chart-frame-empty")).toBeInTheDocument();
  expect(container).toHaveTextContent("No data available");
  unmount();
});
