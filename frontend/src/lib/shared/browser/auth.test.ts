import { expect } from "@std/expect";
import { authTokenAfterAccountSave } from "./auth";

Deno.test("account save replaces the token when the current password changes", () => {
  expect(
    authTokenAfterAccountSave(
      "amol:old-token",
      [{ username: "amol", password: "" }],
      [{ username: "amol", password: "new-token" }],
    ),
  ).toBe("amol:new-token");
});

Deno.test("account save preserves a token for an unchanged account", () => {
  expect(
    authTokenAfterAccountSave(
      "amol:current-token",
      [{ username: "amol", password: "" }],
      [{ username: "amol", password: "" }],
    ),
  ).toBeUndefined();
});

Deno.test("account save authenticates the first newly configured account", () => {
  expect(
    authTokenAfterAccountSave(null, [], [
      { username: "amol", password: "new-token" },
    ]),
  ).toBe("amol:new-token");
});

Deno.test("account save clears a session whose account was removed", () => {
  expect(
    authTokenAfterAccountSave(
      "amol:current-token",
      [{ username: "amol", password: "" }],
      [{ username: "other", password: "" }],
    ),
  ).toBeNull();
});
