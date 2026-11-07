import { Ref } from "#lib/shared/state/ref.svelte";

export interface ToastOptions {
  message: string;
  type?: string;
  duration?: number;
  dismissible?: boolean;
  closeOnClick?: boolean;
  single?: boolean;
  pauseOnHover?: boolean;
  position?: "top-right" | "bottom-right" | "center";
  extraClasses?: string;
  animate?: { in?: string; out?: string; speed?: string };
}

export interface ToastMessage extends ToastOptions {
  id: number;
}

let nextId = 1;
let defaults: ToastOptions = {
  message: "",
  duration: 2000,
  closeOnClick: true,
  position: "top-right",
};
export const toasts = new Ref<ToastMessage[]>([]);
export const toastPosition = new Ref(defaults.position ?? "top-right");

export function setDefaults(options: Omit<ToastOptions, "message">) {
  defaults = { ...defaults, ...options };
  toastPosition.value = defaults.position ?? "top-right";
}

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((item) => item.id !== id);
}

export function toast(options: ToastOptions) {
  if (!options.message) throw new Error("message is required");
  const item = { ...defaults, ...options, id: nextId++ };
  toasts.value = options.single ? [item] : [...toasts.value, item];
  return item.id;
}
