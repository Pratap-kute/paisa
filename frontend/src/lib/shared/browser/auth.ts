import { sha256Hex } from "$lib/shared/utils/crypto";
import {
  api,
  clearAuthToken,
  getAuthToken,
  normalizeApiError,
  setAuthToken,
} from "$lib/api";

interface LoginResult {
  success: boolean;
  error?: string;
}

export async function login(username: string, password: string) {
  setAuthToken(`${username}:${await sha256Hex(password)}`);
  try {
    return await api.ping.getPing() as LoginResult;
  } catch (error) {
    clearAuthToken();
    const normalized = normalizeApiError(error);
    return {
      success: false,
      error: normalized.status === 401
        ? "Invalid username or password"
        : normalized.message,
    };
  }
}

export function isLoggedIn() {
  return Boolean(getAuthToken()?.trim());
}

export function logout() {
  clearAuthToken();
}
