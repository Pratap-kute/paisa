import { describe, expect, test, vi } from "vitest";
import { PersistedState } from "#lib/shared/state/persisted.svelte";
import {
  dismissToast,
  setDefaults,
  toast,
  toastPosition,
  toasts,
} from "#lib/shared/ui/toast";
import { loading } from "#lib/shared/state/store";

describe("persisted stores", () => {
  test("reads, writes, updates, and recovers from invalid values", () => {
    const storage = new Map<string, string>();
    const listeners: Array<(event: StorageEvent) => void> = [];
    const adapter = {
      get length() {
        return storage.size;
      },
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      key: (index: number) => [...storage.keys()][index] ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    } as Storage;
    adapter.setItem("count", "2");
    const value = new PersistedState("count", 0, {
      storage: adapter,
      onStorage: (listener) => listeners.push(listener),
    });
    expect(value.value).toBe(2);
    value.value = 3;
    value.value += 1;
    expect(adapter.getItem("count")).toBe("4");
    listeners[0]({
      storageArea: adapter,
      key: "count",
      newValue: "7",
    } as StorageEvent);
    expect(value.value).toBe(7);
    listeners[0]({
      storageArea: adapter,
      key: "count",
      newValue: "bad",
    } as StorageEvent);
    expect(value.value).toBe(0);
  });
});

describe("toast store", () => {
  test("applies defaults, stacks, replaces, and dismisses", () => {
    toasts.value = [];
    setDefaults({ position: "center", duration: 10 });
    expect(toastPosition.value).toBe("center");
    const id = toast({ message: "first" });
    toast({ message: "only", single: true });
    expect(toasts.value.map((item) => item.message)).toEqual(["only"]);
    dismissToast(id);
    expect(toasts.value).toHaveLength(1);
    expect(() => toast({ message: "" })).toThrow("message is required");
  });
});

describe("loading state", () => {
  test("does not trigger delayed for fast operations under 200ms", () => {
    vi.useFakeTimers();

    loading.value = true;
    vi.advanceTimersByTime(50);
    expect(loading.delayed).toBe(false);

    loading.value = false;
    vi.advanceTimersByTime(200);
    expect(loading.delayed).toBe(false);

    vi.useRealTimers();
  });

  test("activates delayed only for sustained operations over 200ms", () => {
    vi.useFakeTimers();

    loading.value = true;
    vi.advanceTimersByTime(200);
    expect(loading.delayed).toBe(true);

    loading.value = false;
    vi.advanceTimersByTime(200);
    expect(loading.delayed).toBe(false);

    vi.useRealTimers();
  });
});
