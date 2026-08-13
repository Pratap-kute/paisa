import * as toast from "../core/toast";
import { ajax } from "../core/utils";

export async function sync(request: Record<string, any>) {
  const { success, message } = await ajax("/api/sync", {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (!success) {
    toast.toast({
      message: `<b>Failed to sync</b>\n${message}`,
      type: "is-danger",
      duration: 10000,
    });
  }
}
