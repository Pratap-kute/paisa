import dayjs from "dayjs";
import { isString } from "es-toolkit";
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

export function parseJsonWithDates(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (
      isString(value) &&
      /Date|date|time|now/.test(key) &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        value,
      )
    ) {
      return dayjs(value.substring(0, 19));
    }
    return value;
  });
}

function wrapResponse(response: Response): Response {
  return new Proxy(response, {
    get(target, prop) {
      if (prop === "json") {
        return async () => {
          const text = await target.text();
          return parseJsonWithDates(text);
        };
      }
      if (prop === "clone") {
        return () => wrapResponse(target.clone());
      }
      const val = (target as any)[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}

export interface ClientOptions {
  baseUrl?: string;
  customFetch?: typeof fetch;
}

export function createApiClient(options: ClientOptions = {}): Api<unknown> {
  const baseFetch = options.customFetch ??
    (typeof fetch !== "undefined" ? fetch : undefined);

  const customFetch = baseFetch
    ? async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const res = await baseFetch(input, init);
        return wrapResponse(res);
      }
    : undefined;

  const httpClient = new HttpClient({
    baseUrl: options.baseUrl ?? "/api",
    customFetch,
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
