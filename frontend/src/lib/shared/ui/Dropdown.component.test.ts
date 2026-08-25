import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import DropdownHarness from "./Dropdown.test-harness.svelte";

test("supports selection, keyboard navigation, and Escape", async () => {
  const onselect = vi.fn();
  const { getByRole, queryByRole } = render(DropdownHarness, { onselect });
  const trigger = getByRole("button", { name: "Actions" });

  await fireEvent.click(trigger);
  const edit = getByRole("menuitem", { name: "Edit" });
  expect(edit).toBeInTheDocument();
  await fireEvent.click(edit);
  expect(onselect).toHaveBeenCalledOnce();
  await waitFor(() => expect(queryByRole("menu")).not.toBeInTheDocument());

  trigger.focus();
  await fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(getByRole("menu")).toBeInTheDocument();
  await fireEvent.keyDown(getByRole("menu"), { key: "Escape" });
  await waitFor(() => expect(queryByRole("menu")).not.toBeInTheDocument());
});
