import { writable } from "svelte/store";

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
export const toasts = writable<ToastMessage[]>([]);
export const toastPosition = writable(defaults.position ?? "top-right");

export function setDefaults(options: Omit<ToastOptions, "message">) {
  defaults = { ...defaults, ...options };
  toastPosition.set(defaults.position ?? "top-right");
}

export function dismissToast(id: number) {
  toasts.update((items) => items.filter((item) => item.id !== id));
}

export function toast(options: ToastOptions) {
  if (!options.message) throw new Error("message is required");
  const item = { ...defaults, ...options, id: nextId++ };
  toasts.update((items) => options.single ? [item] : [...items, item]);
  return item.id;
}
