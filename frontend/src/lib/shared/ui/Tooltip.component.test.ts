import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, expect, test } from "vitest";
import TooltipHarness from "./Tooltip.test-harness.svelte";

afterEach(cleanup);

test("shows trusted rich tooltip content on hover and focus", async () => {
  const { getByRole, findByRole } = render(TooltipHarness, {
    content: "<strong>Account total</strong>",
  });
  const trigger = getByRole("button", { name: "Tooltip trigger" });

  await fireEvent.pointerEnter(trigger);
  expect(await findByRole("tooltip")).toHaveTextContent("Account total");

  await fireEvent.pointerLeave(trigger);
  await fireEvent.focus(trigger);
  expect(await findByRole("tooltip")).toHaveTextContent("Account total");
});

test("does not create a tooltip for empty content", () => {
  const { getByRole, queryByRole } = render(TooltipHarness, { content: null });
  expect(getByRole("button", { name: "Tooltip trigger" })).toBeInTheDocument();
  expect(queryByRole("tooltip")).not.toBeInTheDocument();
});
