import { fireEvent, render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import CommandPalette from "./CommandPalette.svelte";

test("renders command palette when open", () => {
  const { unmount } = render(CommandPalette, {
    props: { open: true },
  });

  expect(screen.getByRole("dialog", { name: "Command Palette" }))
    .toBeInTheDocument();
  expect(
    screen.getByPlaceholderText("Search pages, accounts, or type a command..."),
  ).toBeInTheDocument();
  expect(screen.getByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("Monthly Expenses")).toBeInTheDocument();
  expect(screen.getByText("Toggle Theme")).toBeInTheDocument();

  unmount();
});

test("filters commands and pages based on search query", async () => {
  const { unmount } = render(CommandPalette, {
    props: { open: true },
  });

  const input = screen.getByPlaceholderText(
    "Search pages, accounts, or type a command...",
  );
  await fireEvent.input(input, { target: { value: "budget" } });

  expect(screen.getByText("Budget")).toBeInTheDocument();
  expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();

  unmount();
});

test("supports keyboard navigation with arrow keys and enter", async () => {
  const { unmount } = render(CommandPalette, {
    props: { open: true },
  });

  await fireEvent.keyDown(globalThis, { key: "ArrowDown" });

  const activeButtons = document.querySelectorAll(
    '[data-command-active="true"]',
  );
  expect(activeButtons.length).toBe(1);

  unmount();
});
