import { describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { persisted } from "../../src/lib/core/persisted";
import {
  dismissToast,
  setDefaults,
  toast,
  toastPosition,
  toasts,
} from "../../src/lib/core/toast";
import {
  delayedLoading,
  delayedUnLoading,
  loading,
} from "../../src/lib/state/store";

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
    const value = persisted("count", 0, {
      storage: adapter,
      onStorage: (listener) => listeners.push(listener),
    });
    expect(get(value)).toBe(2);
    value.set(3);
    value.update((current) => current + 1);
    expect(adapter.getItem("count")).toBe("4");
    listeners[0](
      { storageArea: adapter, key: "count", newValue: "7" } as StorageEvent,
    );
    expect(get(value)).toBe(7);
    listeners[0](
      { storageArea: adapter, key: "count", newValue: "bad" } as StorageEvent,
    );
    expect(get(value)).toBe(0);
  });
});

describe("toast store", () => {
  test("applies defaults, stacks, replaces, and dismisses", () => {
    toasts.set([]);
    setDefaults({ position: "center", duration: 10 });
    expect(get(toastPosition)).toBe("center");
    const id = toast({ message: "first" });
    toast({ message: "only", single: true });
    expect(get(toasts).map((item) => item.message)).toEqual(["only"]);
    dismissToast(id);
    expect(get(toasts)).toHaveLength(1);
    expect(() => toast({ message: "" })).toThrow("message is required");
  });
});

describe("loading and delayedLoading stores", () => {
  test("does not trigger delayedLoading for fast operations under 200ms", () => {
    vi.useFakeTimers();
    let currentDelayed = false;
    const unsubscribe = delayedLoading.subscribe((val) => {
      currentDelayed = val;
    });

    loading.set(true);
    vi.advanceTimersByTime(50);
    expect(currentDelayed).toBe(false);

    loading.set(false);
    vi.advanceTimersByTime(200);
    expect(currentDelayed).toBe(false);

    unsubscribe();
    vi.useRealTimers();
  });

  test("activates delayedLoading only for sustained operations over 200ms", () => {
    vi.useFakeTimers();
    let currentDelayed = false;
    const unsubscribe = delayedLoading.subscribe((val) => {
      currentDelayed = val;
    });

    loading.set(true);
    vi.advanceTimersByTime(200);
    expect(currentDelayed).toBe(true);

    loading.set(false);
    vi.advanceTimersByTime(200);
    expect(currentDelayed).toBe(false);

    unsubscribe();
    vi.useRealTimers();
  });

  test("delayedUnLoading mirrors delayedLoading and does not trigger immediately", () => {
    vi.useFakeTimers();
    let currentUnLoading = false;
    const unsubscribe = delayedUnLoading.subscribe((val) => {
      currentUnLoading = val;
    });

    loading.set(true);
    expect(currentUnLoading).toBe(false);
    vi.advanceTimersByTime(100);
    expect(currentUnLoading).toBe(false);

    loading.set(false);
    vi.advanceTimersByTime(200);
    expect(currentUnLoading).toBe(false);

    unsubscribe();
    vi.useRealTimers();
  });
});
