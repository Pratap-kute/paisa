import type { LayoutLoad } from "./$types";
import { configUpdated } from "$lib/shared/browser/config";
import { setNow } from "$lib/domain/time";
import { clearAuthToken, createApiClient, normalizeApiError } from "$lib/api";
import dayjs from "dayjs";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ fetch }) => {
  const client = createApiClient({ customFetch: fetch });
  let response;
  try {
    response = await client.config.getConfig();
  } catch (error) {
    if (normalizeApiError(error).status === 401) {
      clearAuthToken();
      redirect(307, "/login");
    }
    throw error;
  }
  const { config, now } = response;
  if (now) {
    setNow(dayjs(now));
  }
  globalThis.USER_CONFIG = config as unknown as UserConfig;
  configUpdated();
  return {};
}) satisfies LayoutLoad;
