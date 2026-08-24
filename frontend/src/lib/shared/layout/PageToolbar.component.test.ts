import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import PageToolbar from "./PageToolbar.svelte";

test("renders page toolbar container", () => {
  const { container, unmount } = render(PageToolbar);
  expect(container.querySelector(".paisa-page-toolbar")).toBeInTheDocument();
  expect(container.querySelector(".paisa-toolbar-start")).toBeInTheDocument();
  unmount();
});
