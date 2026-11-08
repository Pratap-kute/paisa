import { flushSync } from "svelte";

/** Runs `effect` as a root effect, flushes it, and returns a function to stop it. */
export function runEffect(effect: () => void): () => void {
  const stop = $effect.root(() => {
    $effect(effect);
  });
  flushSync();
  return stop;
}
