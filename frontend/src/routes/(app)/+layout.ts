import type { LayoutLoad } from "./$types";
import { ajax, configUpdated, setNow } from "$lib/core/utils";

export const load = (async ({ fetch }) => {
  const { config, now } = await ajax("/api/config", { customFetch: fetch });
  if (now) {
    setNow(now);
  }
  globalThis.USER_CONFIG = config;
  configUpdated();
  return {};
}) satisfies LayoutLoad;
