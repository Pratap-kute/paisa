import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, expect, test, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog.svelte";

afterEach(cleanup);

function setup(props: Record<string, unknown> = {}) {
  const onconfirm = vi.fn();
  const oncancel = vi.fn();
  const view = render(ConfirmDialog, {
    open: true,
    title: "Delete template?",
    description: "This cannot be undone.",
    confirmLabel: "Delete",
    onconfirm,
    oncancel,
    ...props,
  });
  return { view, onconfirm, oncancel };
}

test("shows the question and both actions", () => {
  const { view } = setup();
  expect(view.getByText("Delete template?")).toBeVisible();
  expect(view.getByText("This cannot be undone.")).toBeVisible();
  expect(view.getByRole("button", { name: "Delete" })).toBeVisible();
  expect(view.getByRole("button", { name: "Cancel" })).toBeVisible();
});

test("confirming runs the action and does not count as a cancel", async () => {
  const { view, onconfirm, oncancel } = setup();
  await fireEvent.click(view.getByRole("button", { name: "Delete" }));
  expect(onconfirm).toHaveBeenCalledTimes(1);
  expect(oncancel).not.toHaveBeenCalled();
});

test("cancelling reports it and does not run the action", async () => {
  const { view, onconfirm, oncancel } = setup();
  await fireEvent.click(view.getByRole("button", { name: "Cancel" }));
  expect(oncancel).toHaveBeenCalledTimes(1);
  expect(onconfirm).not.toHaveBeenCalled();
});

test("escape dismisses it as a cancel", async () => {
  const { oncancel, onconfirm } = setup();
  await fireEvent.keyDown(document.activeElement ?? document.body, {
    key: "Escape",
  });
  expect(oncancel).toHaveBeenCalledTimes(1);
  expect(onconfirm).not.toHaveBeenCalled();
});
