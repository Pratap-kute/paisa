import * as toast from "../core/toast";
import { api } from "./client";
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
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sync error";
    toast.toast({
      message: `<b>Failed to sync</b>\n${msg}`,
      type: "is-danger",
      duration: 10000,
    });
  }
}
