import { expect } from "@std/expect";
import { normalizeApiError } from "./errors.ts";

Deno.test("normalizeApiError reads generated client response errors", () => {
  const error = normalizeApiError({
    status: 401,
    error: {
      error: "unauthorized",
      message: "Invalid username or password",
    },
  });

  expect(error).toEqual({
    status: 401,
    code: undefined,
    message: "Invalid username or password",
  });
});
