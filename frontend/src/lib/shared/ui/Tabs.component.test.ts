import { fireEvent, render } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import Tabs from "./Tabs.test-harness.svelte";

test("renders tab list and selects active tab", async () => {
  const handleChange = vi.fn();
  const { getByRole, getAllByRole } = render(Tabs, {
    onchange: handleChange,
  });

  const tablist = getByRole("tablist");
  expect(tablist).toBeInTheDocument();

  const tabs = getAllByRole("tab");
  expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  expect(getByRole("tabpanel")).toHaveTextContent("Overview panel");

  tabs[0].focus();
  await fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
  expect(handleChange).toHaveBeenCalledWith("details");
  expect(getByRole("tabpanel")).toHaveTextContent("Details panel");
});
