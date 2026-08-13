import { expect } from "@std/expect";
import { get } from "svelte/store";
import { dismissToast, toast, toasts } from "./toast.ts";

Deno.test("toast stacks, supports single replacement, and dismisses", () => {
  toasts.set([]);
  const first = toast({ message: "first" });
  toast({ message: "second" });
  expect(get(toasts).map(({ message }) => message)).toEqual([
    "first",
    "second",
  ]);
  dismissToast(first);
  expect(get(toasts).map(({ message }) => message)).toEqual(["second"]);
  toast({ message: "only", single: true });
  expect(get(toasts).map(({ message }) => message)).toEqual(["only"]);
});

Deno.test("toast rejects empty messages", () => {
  expect(() => toast({ message: "" })).toThrow("message is required");
});
