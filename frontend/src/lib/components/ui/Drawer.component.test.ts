import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { expect, test } from "vitest";
import DrawerHarness from "../../../test/components/DrawerHarness.svelte";

test("opens and closes drawer through the Paisa wrapper", async () => {
  const { getByRole, queryByRole, unmount } = render(DrawerHarness);

  await fireEvent.click(getByRole("button", { name: "Open harness drawer" }));
  expect(getByRole("dialog")).toBeInTheDocument();
  expect(getByRole("heading", { name: "Harness drawer" })).toBeInTheDocument();

  await fireEvent.click(getByRole("button", { name: "Close drawer" }));
  await waitFor(() => expect(queryByRole("dialog")).not.toBeInTheDocument());
  unmount();
});
