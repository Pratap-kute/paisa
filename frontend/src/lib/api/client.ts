import { Api, HttpClient } from "./generated/Api";

export const tokenKey = "token";

export function getAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(tokenKey);
}

export function setAuthToken(token: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(tokenKey, token);
  }
}

export function clearAuthToken(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(tokenKey);
  }
}

export interface ClientOptions {
  baseUrl?: string;
  customFetch?: typeof fetch;
}

export function createApiClient(options: ClientOptions = {}): Api<unknown> {
  const httpClient = new HttpClient({
    baseUrl: options.baseUrl ?? "/api",
    customFetch: options.customFetch ??
      (typeof fetch !== "undefined" ? fetch : undefined),
    securityWorker: () => {
      const token = getAuthToken();
      if (token && token.trim() !== "") {
        return {
          headers: {
            "X-Auth": token,
          },
        };
      }
      return {};
    },
  });

  return new Api(httpClient);
}

export const api = createApiClient();
