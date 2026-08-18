import { loading } from "../../store";
import { error } from "@sveltejs/kit";
import { goto } from "$app/navigation";

export interface RequestOptions extends RequestInit {
  background?: boolean;
}

export async function apiClient<T = unknown>(
  url: string,
  options?: RequestOptions,
): Promise<T> {
  const isBackground = options?.background ?? false;
  if (!isBackground) {
    loading.set(true);
  }

  try {
    const res = await fetch(url, options);

    if (res.status === 401) {
      goto("/login");
      return {} as T;
    }

    if (res.status >= 400) {
      let bodyText: string;
      try {
        bodyText = await res.text();
      } catch {
        bodyText = res.statusText;
      }
      throw error(res.status, bodyText);
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  } finally {
    if (!isBackground) {
      loading.set(false);
    }
  }
}
