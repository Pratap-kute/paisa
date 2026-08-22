import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import ZeroState from "./ZeroState.svelte";

test("shows empty-state content only for an empty value", () => {
  const empty = render(ZeroState, { item: [] });
  expect(empty.container.querySelector(".paisa-zero-state")).toBeVisible();
  empty.unmount();

  const populated = render(ZeroState, { item: [1] });
  expect(populated.container.querySelector(".paisa-zero-state")).toBeNull();
});
