import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";

const allowDevUi = dev || import.meta.env.VITE_PAISA_E2E_DEV_UI === "true";

export function load() {
  if (!allowDevUi) {
    error(404, "Not found");
  }
}
