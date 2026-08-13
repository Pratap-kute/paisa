import { type Writable, writable } from "svelte/store";

interface PersistedEnvironment {
  storage: Storage | null;
  onStorage: (listener: (event: StorageEvent) => void) => void;
}

function browserEnvironment(): PersistedEnvironment {
  return {
    storage: typeof localStorage === "undefined" ? null : localStorage,
    onStorage: (listener) => {
      if (typeof window !== "undefined") {
        window.addEventListener("storage", listener);
      }
    },
  };
}

export function persisted<T>(
  key: string,
  initialValue: T,
  environment = browserEnvironment(),
): Writable<T> {
  const storage = environment.storage;
  let value = initialValue;
  if (storage) {
    const stored = storage.getItem(key);
    if (stored !== null) {
      try {
        value = JSON.parse(stored) as T;
      } catch {
        storage.removeItem(key);
      }
    }
  }

  const store = writable(value);
  const { subscribe, set: setStore, update: updateStore } = store;
  const set = (next: T) => {
    storage?.setItem(key, JSON.stringify(next));
    setStore(next);
  };

  if (storage) {
    environment.onStorage((event) => {
      if (event.storageArea !== storage || event.key !== key) return;
      try {
        setStore(
          event.newValue === null ? initialValue : JSON.parse(event.newValue),
        );
      } catch {
        setStore(initialValue);
      }
    });
  }

  return {
    subscribe,
    set,
    update: (updater) =>
      updateStore((current) => {
        const next = updater(current);
        storage?.setItem(key, JSON.stringify(next));
        return next;
      }),
  };
}
