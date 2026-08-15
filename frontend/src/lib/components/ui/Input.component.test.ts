import { render, fireEvent } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import Input from "./Input.svelte";

test("renders input with bound value and dispatches events", async () => {
  const handleInput = vi.fn();
  const { getByRole } = render(Input, {
    placeholder: "Search query",
    oninput: handleInput,
  });

  const input = getByRole("textbox");
  expect(input).toHaveAttribute("placeholder", "Search query");
  await fireEvent.input(input, { target: { value: "salary" } });
  expect(handleInput).toHaveBeenCalled();
});
