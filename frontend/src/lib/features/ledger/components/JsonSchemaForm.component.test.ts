import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import type { JSONSchema7 } from "json-schema";
import { api } from "$lib/api";
import JsonSchemaForm from "./JsonSchemaForm.svelte";
import JsonSchemaFormHarness from "./JsonSchemaForm.test-harness.svelte";

test("normalizes a null nested object before binding children", async () => {
  const value = { nested: null as Record<string, unknown> | null };
  const schema: JSONSchema7 = {
    type: "object",
    properties: {
      nested: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    },
  };

  const { unmount } = render(JsonSchemaForm, {
    key: "root",
    value,
    schema,
    variant: "panel",
  });

  await waitFor(() => {
    expect(value.nested).toEqual({});
  });
  unmount();
});

test("normalizes a missing optional array to an empty list", async () => {
  const value = {} as { tags?: unknown[] };
  const schema: JSONSchema7 = {
    type: "object",
    properties: {
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
  };

  const { unmount, getByText } = render(JsonSchemaForm, {
    key: "root",
    value,
    schema,
    variant: "panel",
  });

  await waitFor(() => {
    expect(Array.isArray(value.tags)).toBe(true);
    expect(value.tags).toEqual([]);
  });
  expect(getByText("Nothing here yet. Add one to get started."))
    .toBeInTheDocument();
  unmount();
});

test("normalizes an empty price widget value to an object", async () => {
  const providersSpy = vi.spyOn(api.price, "getPriceProviders")
    .mockResolvedValue({ providers: [] });

  let value: Record<string, unknown> | null = null;
  const schema: JSONSchema7 & { "ui:widget"?: string } = {
    type: "object",
    "ui:widget": "price",
    properties: {
      code: { type: "string" },
      provider: { type: "string" },
    },
  };

  const { unmount } = render(JsonSchemaForm, {
    key: "price",
    get value() {
      return value;
    },
    set value(next) {
      value = next;
    },
    schema,
  });

  await waitFor(() => {
    expect(value).toEqual({});
  });
  unmount();
  await waitFor(() => {
    expect(providersSpy).toHaveBeenCalled();
  });
  providersSpy.mockRestore();
});

test("adds a default item from a reactive schema", async () => {
  const { getByRole, unmount } = render(JsonSchemaFormHarness);

  await fireEvent.click(getByRole("button", { name: "Add" }));

  expect(getByRole("textbox", { name: "Username" })).toHaveValue("john.doe");
  unmount();
});
