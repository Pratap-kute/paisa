import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { expect, test } from "vitest";
import ChartFrame from "./ChartFrame.svelte";

test("renders chart frame with one explicit height intent", () => {
  const { container, unmount } = render(ChartFrame, {
    height: "tall",
    title: "Monthly Cash Flow",
  });

  const frame = container.querySelector(".paisa-chart-frame");
  expect(frame).toBeInTheDocument();
  expect(frame).toHaveClass("paisa-chart-height-tall");
  expect(frame).not.toHaveClass("paisa-chart-row-aware");
  expect(container.querySelector(".paisa-chart-frame-title")).toHaveTextContent(
    "Monthly Cash Flow",
  );
  unmount();
});

test("renders empty state message when empty prop is true", () => {
  const { container, unmount } = render(ChartFrame, {
    empty: true,
    emptyMessage: "No data available",
  });

  expect(container.querySelector(".paisa-chart-frame-empty"))
    .toBeInTheDocument();
  expect(container).toHaveTextContent("No data available");
  unmount();
});

test("enables row-aware height only when rows are provided", () => {
  const { container, unmount } = render(ChartFrame, {
    height: "compact",
    rows: 7,
  });

  const frame = container.querySelector(".paisa-chart-frame");
  expect(frame).toHaveClass("paisa-chart-height-compact");
  expect(frame).toHaveClass("paisa-chart-row-aware");
  expect(frame?.getAttribute("style")).toContain("--paisa-chart-rows: 7");
  unmount();
});

test("renders loading state when loading prop is true", () => {
  const { container, unmount } = render(ChartFrame, {
    loading: true,
  });

  expect(container.querySelector(".paisa-chart-frame-loading"))
    .toBeInTheDocument();
  unmount();
});

test("renders error state when error prop is true", () => {
  const { container, unmount } = render(ChartFrame, {
    error: true,
    errorTitle: "Chart failed",
    errorMessage: "Could not draw chart",
  });

  expect(container.querySelector(".paisa-chart-frame-error"))
    .toBeInTheDocument();
  expect(container).toHaveTextContent("Chart failed");
  expect(container).toHaveTextContent("Could not draw chart");
  unmount();
});

test("renders chart children in ready state", () => {
  const { container, unmount } = render(ChartFrame, {
    children: createRawSnippet(() => ({
      render: () => '<svg data-testid="chart"></svg>',
    })),
  });

  expect(container.querySelector("svg[data-testid='chart']"))
    .toBeInTheDocument();
  unmount();
});

test("can preserve chart children behind an empty state", () => {
  const { container, unmount } = render(ChartFrame, {
    empty: true,
    preserveChildren: true,
    children: createRawSnippet(() => ({
      render: () => '<svg data-testid="preserved-chart"></svg>',
    })),
  });

  expect(container.querySelector(".paisa-chart-frame-empty"))
    .toBeInTheDocument();
  expect(container.querySelector(".paisa-chart-frame-preserved svg"))
    .toBeInTheDocument();
  unmount();
});
