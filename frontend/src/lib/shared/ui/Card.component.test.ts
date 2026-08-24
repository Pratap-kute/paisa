import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Card from "./Card.svelte";

test("renders card with variant, padding, and interactive classes", () => {
  const { container, unmount } = render(Card, {
    variant: "bordered",
    padding: "sm",
    interactive: true,
  });

  const card = container.querySelector(".paisa-card");
  expect(card).toHaveClass("paisa-card-bordered");
  expect(card).toHaveClass("paisa-card-pad-sm");
  expect(card).toHaveClass("paisa-card-interactive");
  unmount();
});
