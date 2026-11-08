import { flushSync } from "svelte";
import { describe, expect, test } from "vitest";
import { runEffect } from "#lib/shared/testing/effects.svelte";
import { Ref } from "./ref.svelte";

describe("Ref", () => {
  test("value is reactive", () => {
    const ref = new Ref(1);
    const seen: number[] = [];
    const stop = runEffect(() => {
      seen.push(ref.value);
    });
    ref.value = 2;
    flushSync();
    stop();
    expect(seen).toEqual([1, 2]);
  });

  test("update inside an effect does not subscribe to the value it writes", () => {
    const ref = new Ref({ count: 0 });
    let runs = 0;
    const stop = runEffect(() => {
      runs++;
      ref.update((current) => ({ count: current.count + 1 }));
    });
    stop();
    expect(runs).toBe(1);
    expect(ref.value.count).toBe(1);
  });
});
