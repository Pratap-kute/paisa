import { expect } from "@std/expect";
import { authTokenAfterAccountSave } from "./auth";

Deno.test("account save replaces the token when the current password changes", () => {
  expect(
    authTokenAfterAccountSave(
      "testuser:old-token",
      [{ username: "testuser", password: "" }],
      [{ username: "testuser", password: "new-token" }],
    ),
  ).toBe("testuser:new-token");
});

Deno.test("account save preserves a token for an unchanged account", () => {
  expect(
    authTokenAfterAccountSave(
      "testuser:current-token",
      [{ username: "testuser", password: "" }],
      [{ username: "testuser", password: "" }],
    ),
  ).toBeUndefined();
});

Deno.test("account save authenticates the first newly configured account", () => {
  expect(
    authTokenAfterAccountSave(null, [], [
      { username: "testuser", password: "new-token" },
    ]),
  ).toBe("testuser:new-token");
});

Deno.test("account save clears a session whose account was removed", () => {
  expect(
    authTokenAfterAccountSave(
      "testuser:current-token",
      [{ username: "testuser", password: "" }],
      [{ username: "other", password: "" }],
    ),
  ).toBeNull();
});
