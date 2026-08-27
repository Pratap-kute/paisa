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

interface UserAccountCredential {
  username?: string;
  password?: string;
}

export function authTokenAfterAccountSave(
  currentToken: string | null,
  previousAccounts: UserAccountCredential[],
  nextAccounts: UserAccountCredential[],
): string | null | undefined {
  if (nextAccounts.length === 0) return null;

  const currentUsername = currentToken?.split(":", 1)[0];
  const currentAccount = nextAccounts.find((account) =>
    account.username === currentUsername
  );
  if (currentAccount?.username && currentAccount.password) {
    return `${currentAccount.username}:${currentAccount.password}`;
  }
  if (
    currentAccount &&
    previousAccounts.some((account) => account.username === currentUsername)
  ) {
    return undefined;
  }

  const configuredAccount = nextAccounts.find((account) =>
    account.username && account.password
  );
  if (configuredAccount?.username && configuredAccount.password) {
    return `${configuredAccount.username}:${configuredAccount.password}`;
  }

  return null;
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
