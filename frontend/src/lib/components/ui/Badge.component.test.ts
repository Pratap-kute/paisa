import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Badge from "./Badge.svelte";

test("renders badge variant classes properly", () => {
  const { container, unmount } = render(Badge, {
    variant: "success",
    rounded: true,
  });
  const span = container.querySelector(".paisa-badge");
  expect(span).toHaveClass("paisa-badge-success");
  expect(span).toHaveClass("paisa-badge-rounded");
  unmount();

  const warning = render(Badge, {
    variant: "warning",
    dot: true,
  });
  expect(warning.container.querySelector(".paisa-badge")).toHaveClass("paisa-badge-warning");
  expect(warning.container.querySelector(".paisa-badge-dot"))
    .toBeInTheDocument();
});
