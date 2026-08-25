import { fireEvent, render } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import type { Legend } from "$lib/shared/charts/types";
import LegendCard from "./LegendCard.svelte";

test("renders renderer-neutral line, square, and hatch symbols", () => {
  const legends: Legend[] = [
    { label: "Balance", value: "INR 1,000", color: "blue", shape: "line" },
    { label: "Income", color: "green", shape: "square" },
    {
      label: "Tax",
      color: "orange",
      shape: "square",
      symbol: "diagonal-stripe",
    },
  ];

  const { container, getByText, unmount } = render(LegendCard, { legends });

  expect(container.querySelectorAll("[data-testid='legend-symbol']"))
    .toHaveLength(3);
  expect(container.querySelector(".legend-pattern-diagonal"))
    .toBeInTheDocument();
  expect(container.querySelector("svg")).not.toBeInTheDocument();
  expect(getByText("INR 1,000")).toBeInTheDocument();
  unmount();
});

test("preserves typed callbacks and a single selected legend", async () => {
  const onFirst = vi.fn();
  const onSecond = vi.fn();
  const legends: Legend[] = [
    { label: "Food", color: "red", shape: "square", onClick: onFirst },
    { label: "Travel", color: "blue", shape: "square", onClick: onSecond },
  ];

  const { getByRole, unmount } = render(LegendCard, { legends });
  const food = getByRole("button", { name: "Food" });
  const travel = getByRole("button", { name: "Travel" });

  await fireEvent.click(food);
  expect(onFirst).toHaveBeenCalledWith(legends[0]);
  expect(food).toHaveAttribute("aria-pressed", "true");

  await fireEvent.click(travel);
  expect(onSecond).toHaveBeenCalledWith(legends[1]);
  expect(food).toHaveAttribute("aria-pressed", "false");
  expect(travel).toHaveAttribute("aria-pressed", "true");
  expect(legends[0].selected).toBe(false);
  expect(legends[1].selected).toBe(true);
  unmount();
});
