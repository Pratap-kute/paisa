import { expect, test } from "vitest";
import { dismissToast, toast, toasts } from "#lib/shared/ui/toast";

test("toast stacks, supports single replacement, and dismisses", () => {
  toasts.value = [];
  const first = toast({ message: "first" });
  toast({ message: "second" });
  expect(toasts.value.map(({ message }) => message)).toEqual([
    "first",
    "second",
  ]);
  dismissToast(first);
  expect(toasts.value.map(({ message }) => message)).toEqual(["second"]);
  toast({ message: "only", single: true });
  expect(toasts.value.map(({ message }) => message)).toEqual(["only"]);
});

test("toast rejects empty messages", () => {
  expect(() => toast({ message: "" })).toThrow("message is required");
});
