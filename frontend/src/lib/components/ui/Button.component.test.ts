import { render, fireEvent } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import Button from "./Button.svelte";

test("renders button with text and triggers onclick event", async () => {
  const handleClick = vi.fn();
  const { getByRole, unmount } = render(Button, {
    onclick: handleClick,
  });

  const button = getByRole("button");
  expect(button).toBeInTheDocument();
  await fireEvent.click(button);
  expect(handleClick).toHaveBeenCalledTimes(1);
  unmount();
});

test("disables button when loading or disabled prop is set", () => {
  const { getByRole, unmount } = render(Button, {
    disabled: true,
  });
  expect(getByRole("button")).toBeDisabled();
  unmount();

  const loading = render(Button, {
    loading: true,
  });
  expect(loading.getByRole("button")).toBeDisabled();
  loading.unmount();
});
