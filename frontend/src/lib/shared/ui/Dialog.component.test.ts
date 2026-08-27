import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { expect, test } from "vitest";
import DialogHarness from "../../../../tests/setup/components/DialogHarness.svelte";

test("opens and closes dialog through the Paisa wrapper", async () => {
  const { getByRole, queryByRole, unmount } = render(DialogHarness);

  await fireEvent.click(getByRole("button", { name: "Open harness dialog" }));
  expect(getByRole("dialog")).toBeInTheDocument();
  expect(getByRole("heading", { name: "Harness dialog" })).toBeInTheDocument();

  await fireEvent.click(getByRole("button", { name: "Close dialog" }));
  await waitFor(() => expect(queryByRole("dialog")).not.toBeInTheDocument());
  unmount();
});
