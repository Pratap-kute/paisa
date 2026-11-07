/**
 * A reactive value shared across modules and components. Read and write it
 * through `value`; assigning replaces the value, it is never deeply proxied.
 */
export class Ref<T> {
  value = $state.raw() as T;

  constructor(initial: T) {
    this.value = initial;
  }
}
