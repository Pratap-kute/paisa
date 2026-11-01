import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import LoadingState from "./LoadingState.svelte";

test("announces what is loading to assistive technology", () => {
  const view = render(LoadingState, { message: "Loading postings..." });
  const status = view.getByRole("status");
  expect(status).toHaveAttribute("aria-live", "polite");
  expect(view.getByText("Loading postings...")).toBeVisible();
});

test("falls back to a generic message and can omit it", () => {
  expect(render(LoadingState).getByText("Loading...")).toBeVisible();
  const quiet = render(LoadingState, { message: "" });
  expect(quiet.container.querySelector(".paisa-loading-message")).toBeNull();
});
