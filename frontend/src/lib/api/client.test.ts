import { expect } from "@std/expect";
import { clearAuthToken, createApiClient, setAuthToken } from "./client";

Deno.test("sends the stored authentication token on generated API requests", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  let request: Request | undefined;
  const client = createApiClient({
    baseUrl: "http://localhost/api",
    customFetch: (input, init) => {
      request = new Request(input, init);
      return Promise.resolve(Response.json({ success: true }));
    },
  });
  setAuthToken("amol:password-token");

  await client.ping.getPing();

  expect(request?.headers.get("X-Auth")).toBe("amol:password-token");
  clearAuthToken();
  Reflect.deleteProperty(globalThis, "localStorage");
});
