import * as toast from "$lib/shared/ui/toast";
import { api } from "./client";
import { extractErrorMessage } from "./errors";
import type { ServerSyncRequest } from "./generated/Api";

export async function sync(request: ServerSyncRequest) {
  try {
    const res = await api.sync.syncData(request);
    if (!res.success) {
      toast.toast({
        message: `<b>Failed to sync</b>\n${res.message || "Sync failed"}`,
        type: "is-danger",
        duration: 10000,
      });
      return false;
    }
    return true;
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    toast.toast({
      message: `<b>Failed to sync</b>\n${msg}`,
      type: "is-danger",
      duration: 10000,
    });
    return false;
  }
}
