<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    message?: string;
    size?: "sm" | "md" | "lg";
    fullscreen?: boolean;
    children?: Snippet;
  }

  let {
    message = "Loading...",
    size = "md",
    fullscreen = false,
    children,
  }: Props = $props();

  const spinnerSizes: Record<string, string> = {
    sm: "is-size-5",
    md: "is-size-3",
    lg: "is-size-1",
  };
</script>

<div
  class="paisa-loading-state has-text-centered {fullscreen ? 'is-fullscreen' : 'p-6'}"
  role="status"
  aria-live="polite"
>
  <div class="paisa-loading-spinner mb-3 has-text-link {spinnerSizes[size]}">
    <span class="icon">
      <i class="fas fa-circle-notch fa-spin"></i>
    </span>
  </div>
  {#if message}
    <p class="has-text-grey is-size-6">{message}</p>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .paisa-loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .paisa-loading-state.is-fullscreen {
    min-height: 60vh;
  }
</style>
