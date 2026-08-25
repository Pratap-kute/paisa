import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import { api, tokenKey } from "$lib/api";
import { sha256Hex } from "$lib/shared/utils/crypto";
import LoginPage from "./+page.svelte";

test("submits the values visible in password-manager-populated inputs", async () => {
  const pingSpy = vi.spyOn(api.ping, "getPing")
    .mockResolvedValue({ success: false });
  const { container, getByLabelText, unmount } = render(LoginPage);
  const username = getByLabelText("Username") as HTMLInputElement;
  const password = getByLabelText("Password") as HTMLInputElement;

  await fireEvent.input(username, { target: { value: "stale-user" } });
  await fireEvent.input(password, { target: { value: "stale-password" } });

  username.value = "amol";
  password.value = "amol@123";
  await fireEvent.submit(container.querySelector("form")!);

  await waitFor(async () => {
    expect(localStorage.getItem(tokenKey)).toBe(
      `amol:${await sha256Hex("amol@123")}`,
    );
  });

  localStorage.removeItem(tokenKey);
  pingSpy.mockRestore();
  unmount();
});
