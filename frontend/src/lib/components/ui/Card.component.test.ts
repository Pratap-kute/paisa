import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Card from "./Card.svelte";

test("renders card with variant, padding, and interactive classes", () => {
  const { container, unmount } = render(Card, {
    variant: "bordered",
    padding: "sm",
    interactive: true,
  });

  const box = container.querySelector(".box");
  expect(box).toHaveClass("is-bordered");
  expect(box).toHaveClass("p-3");
  expect(box).toHaveClass("paisa-card-interactive");
  unmount();
});
