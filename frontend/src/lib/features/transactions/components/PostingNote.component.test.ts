import { fireEvent, render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import PostingNoteVirtualList from "./PostingNoteVirtualList.test-harness.svelte";

test("renders a tooltip inside the virtual postings list", async () => {
  const { getByRole, findByRole } = render(PostingNoteVirtualList);
  const trigger = getByRole("button");
  expect(trigger).toBeInTheDocument();
  await fireEvent.pointerEnter(trigger);
  expect(await findByRole("tooltip")).toHaveTextContent("Posting note");
});
