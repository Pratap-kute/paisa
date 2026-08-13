import { expect } from "@std/expect";
import { get } from "svelte/store";
import { persisted } from "./persisted";

class MemoryStorage implements Storage {
  #values = new Map<string, string>();
  get length() {
    return this.#values.size;
  }
  clear() {
    this.#values.clear();
  }
  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.#values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.#values.delete(key);
  }
  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }
}

Deno.test("persisted serializes values and follows storage events", () => {
  const storage = new MemoryStorage();
  let listener: ((event: StorageEvent) => void) | undefined;
  const store = persisted("theme", "light", {
    storage,
    onStorage: (next) => listener = next,
  });

  store.set("dark");
  expect(storage.getItem("theme")).toBe('"dark"');
  listener?.(
    {
      storageArea: storage,
      key: "theme",
      newValue: '"system"',
    } as StorageEvent,
  );
  expect(get(store)).toBe("system");
  listener?.(
    { storageArea: storage, key: "theme", newValue: null } as StorageEvent,
  );
  expect(get(store)).toBe("light");
});

Deno.test("persisted is safe without browser storage", () => {
  const store = persisted("missing", 1, { storage: null, onStorage: () => {} });
  store.update((value) => value + 1);
  expect(get(store)).toBe(2);
});
