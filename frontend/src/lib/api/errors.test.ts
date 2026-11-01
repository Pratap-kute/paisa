import { test, expect } from "bun:test";
import { normalizeApiError } from "./errors.ts";

test("normalizeApiError reads generated client response errors", () => {
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

test("normalizeApiError preserves generated client validation codes", () => {
  const error = normalizeApiError({
    status: 400,
    error: { code: "invalid_scenario_event" },
  });
  expect(error.code).toBe("invalid_scenario_event");
  expect(error.status).toBe(400);
});
