export interface PersistedEnvironment {
  storage: Storage | null;
  onStorage: (listener: (event: StorageEvent) => void) => void;
}

function browserEnvironment(): PersistedEnvironment {
  return {
    storage: typeof localStorage === "undefined" ? null : localStorage,
    onStorage: (listener) => {
      if (typeof window !== "undefined") {
        globalThis.addEventListener("storage", listener);
      }
    },
  };
}

/** A reactive value mirrored to localStorage and kept in sync across tabs. */
export class PersistedState<T> {
  #key: string;
  #initialValue: T;
  #storage: Storage | null;
  #value = $state.raw() as T;

  constructor(
    key: string,
    initialValue: T,
    environment = browserEnvironment(),
  ) {
    this.#key = key;
    this.#initialValue = initialValue;
    this.#storage = environment.storage;
    this.#value = this.#read();

    environment.onStorage((event) => {
      if (event.storageArea !== this.#storage || event.key !== key) return;
      this.#value = this.#parse(event.newValue);
    });
  }

  get value(): T {
    return this.#value;
  }

  set value(next: T) {
    this.#value = next;
    this.#storage?.setItem(this.#key, JSON.stringify(next));
  }

  #read(): T {
    const stored = this.#storage?.getItem(this.#key) ?? null;
    if (stored === null) return this.#initialValue;
    try {
      return JSON.parse(stored) as T;
    } catch {
      this.#storage?.removeItem(this.#key);
      return this.#initialValue;
    }
  }

  #parse(raw: string | null): T {
    if (raw === null) return this.#initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return this.#initialValue;
    }
  }
}
