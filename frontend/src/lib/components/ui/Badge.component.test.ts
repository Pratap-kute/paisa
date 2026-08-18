import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Badge from "./Badge.svelte";

test("renders badge variant classes properly", () => {
  const { container, unmount } = render(Badge, {
    variant: "success",
    rounded: true,
  });
  const span = container.querySelector(".tag");
  expect(span).toHaveClass("is-success");
  expect(span).toHaveClass("is-rounded");
  unmount();

  const warning = render(Badge, {
    variant: "warning",
    dot: true,
  });
  expect(warning.container.querySelector(".tag")).toHaveClass("is-warning");
  expect(warning.container.querySelector(".paisa-badge-dot"))
    .toBeInTheDocument();
});
