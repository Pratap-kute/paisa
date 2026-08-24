import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Skeleton from "./Skeleton.svelte";

test("renders stable skeleton geometry", () => {
  const { getByRole, unmount } = render(Skeleton, {
    width: "12rem",
    height: "2rem",
    radius: "lg",
    label: "Loading metrics",
  });

  const skeleton = getByRole("status");
  expect(skeleton).toHaveAttribute("aria-label", "Loading metrics");
  expect(skeleton).toHaveClass("paisa4-skeleton");
  expect(skeleton).toHaveClass("paisa4-radius-lg");
  expect(skeleton).toHaveStyle({ width: "192px", height: "32px" });
  unmount();
});
