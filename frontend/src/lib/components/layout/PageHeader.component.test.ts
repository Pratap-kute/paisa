import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import PageHeader from "./PageHeader.svelte";

test("renders page header with title, description, and tag", () => {
  const { container, unmount } = render(PageHeader, {
    title: "Transactions",
    description: "View all journal transactions",
    tag: "Beta",
  });

  expect(container.querySelector(".paisa-page-title")).toHaveTextContent("Transactions");
  expect(container.querySelector(".paisa-page-description")).toHaveTextContent("View all journal transactions");
  expect(container.querySelector(".paisa-badge")).toHaveTextContent("Beta");
  unmount();
});
