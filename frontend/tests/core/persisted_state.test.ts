import { expect, test } from "vitest";
import { PersistedState } from "#lib/shared/state/persisted.svelte";

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

test("persisted serializes values and follows storage events", () => {
  const storage = new MemoryStorage();
  let listener: ((event: StorageEvent) => void) | undefined;
  const state = new PersistedState("theme", "light", {
    storage,
    onStorage: (next) => (listener = next),
  });

  state.value = "dark";
  expect(storage.getItem("theme")).toBe('"dark"');
  listener?.({
    storageArea: storage,
    key: "theme",
    newValue: '"system"',
  } as unknown as StorageEvent);
  expect(state.value).toBe("system");
  listener?.({
    storageArea: storage,
    key: "theme",
    newValue: null,
  } as unknown as StorageEvent);
  expect(state.value).toBe("light");
});

test("persisted is safe without browser storage", () => {
  const state = new PersistedState("missing", 1, {
    storage: null,
    onStorage: () => {},
  });
  state.value += 1;
  expect(state.value).toBe(2);
});
