import { untrack } from "svelte";

/**
 * A reactive value shared across modules and components. Read and write it
 * through `value`; assigning replaces the value, it is never deeply proxied.
 */
export class Ref<T> {
  value = $state.raw() as T;

  constructor(initial: T) {
    this.value = initial;
  }

  /**
   * Derives the next value from the current one without subscribing to it, so
   * writers that run inside an effect (such as editor listeners) cannot
   * re-trigger that effect.
   */
  update(updater: (current: T) => T) {
    this.value = updater(untrack(() => this.value));
  }
}
