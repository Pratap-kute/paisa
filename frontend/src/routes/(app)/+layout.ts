import type { LayoutLoad } from "./$types";
import { configUpdated, setNow } from "$lib/core/utils";
import { createApiClient } from "$lib/api";
import dayjs from "dayjs";

export const load = (async ({ fetch }) => {
  const client = createApiClient({ customFetch: fetch });
  const { config, now } = await client.config.getConfig();
  if (now) {
    setNow(dayjs(now));
  }
  globalThis.USER_CONFIG = config as any;
  configUpdated();
  return {};
}) satisfies LayoutLoad;
