import { fireEvent, render } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import Tabs from "./Tabs.svelte";

test("renders tab list and selects active tab", async () => {
  const handleChange = vi.fn();
  const options = [
    { label: "Overview", value: "overview" },
    { label: "Details", value: "details" },
  ];

  const { getByRole, getAllByRole } = render(Tabs, {
    options,
    value: "overview",
    onchange: handleChange,
  });

  const tablist = getByRole("tablist");
  expect(tablist).toBeInTheDocument();

  const tabs = getAllByRole("tab");
  expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  expect(tabs[1]).toHaveAttribute("aria-selected", "false");

  await fireEvent.click(tabs[1]);
  expect(handleChange).toHaveBeenCalledWith("details");
});
