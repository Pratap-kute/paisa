import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import FormField from "./FormField.svelte";

test("associates label, description, and error message ids", () => {
  const { getByText, unmount } = render(FormField, {
    id: "posting-account",
    label: "Posting account",
    description: "Choose the destination account.",
    error: "Account is required.",
    required: true,
  });

  expect(getByText("Posting account")).toHaveAttribute(
    "for",
    "posting-account",
  );
  expect(getByText("Choose the destination account.")).toHaveAttribute(
    "id",
    "posting-account-description",
  );
  expect(getByText("Account is required.")).toHaveAttribute(
    "id",
    "posting-account-message",
  );
  unmount();
});
