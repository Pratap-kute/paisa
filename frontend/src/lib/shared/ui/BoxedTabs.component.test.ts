import { fireEvent, render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import BoxedTabs from "./BoxedTabs.svelte";

test("acts as a pressed-button selector rather than a tab set", async () => {
  const { getByRole, getAllByRole, queryByRole } = render(BoxedTabs, {
    options: [
      { label: "One year", value: 1 },
      { label: "Three years", value: 3 },
    ],
    value: 1,
  });

  expect(getByRole("group")).toBeInTheDocument();
  expect(queryByRole("tablist")).not.toBeInTheDocument();
  const buttons = getAllByRole("button");
  expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
  await fireEvent.click(buttons[1]);
  expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
});
