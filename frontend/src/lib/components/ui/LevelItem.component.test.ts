import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import LevelItem from "./LevelItem.svelte";

test("renders title, value, and subtitle properly", () => {
  const { getByText, unmount } = render(LevelItem, {
    title: "Gross Income",
    value: "₹21,60,016",
    subtitle: "₹16,25,891 net income",
  });

  expect(getByText("Gross Income")).toBeInTheDocument();
  expect(getByText("₹21,60,016")).toBeInTheDocument();
  expect(getByText("₹16,25,891 net income")).toBeInTheDocument();
  unmount();
});

test("applies color, narrow, and small classes properly", () => {
  const { container, getByText, unmount } = render(LevelItem, {
    title: "Tax",
    value: "₹5,34,125",
    color: "rgb(239, 68, 68)",
    narrow: true,
    small: true,
  });

  const levelItem = container.querySelector(".level-item");
  expect(levelItem).toHaveClass("is-narrow");
  expect(levelItem).toHaveClass("small");

  const titleEl = getByText("₹5,34,125");
  expect(titleEl).toHaveStyle({ color: "rgb(239, 68, 68)" });
  unmount();
});
