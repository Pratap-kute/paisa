import { sha256Hex } from "$lib/shared/utils/crypto";
import { api, clearAuthToken, getAuthToken, setAuthToken } from "$lib/api";
export async function login(username: string, password: string) {
  setAuthToken(`${username}:${await sha256Hex(password)}`);
  return await api.ping.getPing() as unknown as {
    success: boolean;
    error?: string;
  };
}

export function isLoggedIn() {
  return Boolean(getAuthToken()?.trim());
}

export function logout() {
  clearAuthToken();
}
