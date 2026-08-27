import { fireEvent, render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import PostingNoteVirtualList from "./PostingNoteVirtualList.test-harness.svelte";

test("renders a tooltip inside the virtual postings list", async () => {
  const { container, getByRole, findByRole } = render(
    PostingNoteVirtualList,
  );
  expect(container.querySelectorAll("[data-tooltip-trigger]")).toHaveLength(2);

  await fireEvent.click(getByRole("button", { name: "Filter postings" }));
  expect(container.querySelectorAll("[data-tooltip-trigger]")).toHaveLength(1);

  const trigger = container.querySelector<HTMLButtonElement>(
    "[data-tooltip-trigger]",
  );
  expect(trigger).not.toBeNull();
  if (!trigger) throw new Error("Expected a posting note tooltip trigger");
  expect(trigger).toBeInTheDocument();
  await fireEvent.pointerEnter(trigger);
  expect(await findByRole("tooltip")).toHaveTextContent("Posting note");
});
