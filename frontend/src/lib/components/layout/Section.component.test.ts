import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Section from "./Section.svelte";

test("renders section with title and subtitle", () => {
  const { container, unmount } = render(Section, {
    title: "Income Breakdown",
    subtitle: "By monthly category",
  });

  expect(container.querySelector(".paisa-section-title")).toHaveTextContent(
    "Income Breakdown",
  );
  expect(container.querySelector(".paisa-section-subtitle")).toHaveTextContent(
    "By monthly category",
  );
  unmount();
});

test("renders section with title link", () => {
  const { container, unmount } = render(Section, {
    title: "Expenses",
    titleHref: "/expense/monthly",
  });

  const link = container.querySelector(".paisa-section-title-link");
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/expense/monthly");
  expect(link).toHaveTextContent("Expenses");
  unmount();
});
