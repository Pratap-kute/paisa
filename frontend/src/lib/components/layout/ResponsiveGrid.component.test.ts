import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import ResponsiveGrid from "./ResponsiveGrid.svelte";

test("renders responsive grid with column and gap classes", () => {
  const { container, unmount } = render(ResponsiveGrid, {
    cols: 2,
    gap: 3,
  });

  const grid = container.querySelector(".paisa-responsive-grid");
  expect(grid).toBeInTheDocument();
  expect(grid).toHaveClass("paisa-grid-cols-2");
  expect(grid).toHaveClass("gap-3");
  unmount();
});
