import { describe, expect, it, vi } from "vitest";
import { createApiClient, getAuthToken, setAuthToken, clearAuthToken } from "$lib/api/client";
import { ApiError, isApiError } from "$lib/api/errors";

describe("API Client Runtime", () => {
  it("injects X-Auth header when token is stored", async () => {
    let capturedHeaders: Record<string, string> | undefined;

    const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const storage: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage[k] || null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
    });

    setAuthToken("admin:secret");
    expect(getAuthToken()).toBe("admin:secret");

    const client = createApiClient({ customFetch: mockFetch as unknown as typeof fetch });
    const res = await client.config.getConfig();

    expect(capturedHeaders?.["X-Auth"]).toBe("admin:secret");

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it("does not inject X-Auth header when token is absent", async () => {
    let capturedHeaders: Record<string, string> | undefined;

    const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });

    const client = createApiClient({ customFetch: mockFetch as unknown as typeof fetch });
    const res = await client.ping.getPing();

    expect(res.success).toBe(true);
    expect(capturedHeaders?.["X-Auth"]).toBeUndefined();
  });

  it("calls expected URL path and method", async () => {
    let calledUrl = "";
    let calledMethod = "";

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calledUrl = url;
      calledMethod = init?.method || "GET";
      return Promise.resolve(
        new Response(JSON.stringify({ config: { currency: "INR" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const client = createApiClient({ baseUrl: "/api", customFetch: mockFetch as unknown as typeof fetch });
    await client.config.getConfig();

    expect(calledUrl).toBe("/api/config");
    expect(calledMethod).toBe("GET");
  });

  it("serializes JSON request body for mutations", async () => {
    let sentBody = "";

    const mockFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      sentBody = (init?.body as string) || "";
      return Promise.resolve(
        new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const client = createApiClient({ customFetch: mockFetch as unknown as typeof fetch });
    await client.templates.upsertTemplate({ name: "food", content: "..." });

    expect(JSON.parse(sentBody)).toEqual({ name: "food", content: "..." });
  });

  it("identifies ApiError instances correctly", () => {
    const err = new ApiError(404, "Not Found", "NOT_FOUND");
    expect(isApiError(err)).toBe(true);
    expect(isApiError(new Error("generic"))).toBe(false);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not Found");
  });
});
