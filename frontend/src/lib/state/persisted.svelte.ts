const isBrowser = typeof window !== "undefined" &&
  typeof localStorage !== "undefined";

export class PersistedState<T> {
  #key: string;
  #value = $state<T>() as T;

  constructor(key: string, initialValue: T) {
    this.#key = key;
    if (isBrowser) {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        try {
          this.#value = JSON.parse(stored);
        } catch {
          this.#value = initialValue;
        }
      } else {
        this.#value = initialValue;
      }
    } else {
      this.#value = initialValue;
    }
  }

  get value(): T {
    return this.#value;
  }

  set value(newValue: T) {
    this.#value = newValue;
    if (isBrowser) {
      localStorage.setItem(this.#key, JSON.stringify(newValue));
    }
  }
}

export function createPersistedState<T>(
  key: string,
  initialValue: T,
): PersistedState<T> {
  return new PersistedState<T>(key, initialValue);
}
