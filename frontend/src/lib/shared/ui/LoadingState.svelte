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

const spinnerSizeClasses: Record<string, string> = {
  sm: "paisa-loading-spinner-sm",
  md: "paisa-loading-spinner-md",
  lg: "paisa-loading-spinner-lg",
};
</script>

<div
  class="paisa-loading-state {fullscreen ? 'paisa-loading-fullscreen' : ''}"
  role="status"
  aria-live="polite"
>
  <div class="paisa-loading-spinner {spinnerSizeClasses[size]}" aria-hidden="true">
    <i class="fas fa-circle-notch fa-spin"></i>
  </div>
  {#if message}
    <p class="paisa-loading-message">{message}</p>
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
  padding: var(--paisa-space-6, 2rem);
  text-align: center;
}

.paisa-loading-fullscreen {
  min-height: 60vh;
  padding: 0;
}

.paisa-loading-spinner {
  margin-bottom: var(--paisa-space-3, 0.75rem);
  color: var(--paisa-primary);
  line-height: 1;
}

.paisa-loading-spinner-sm {
  font-size: 1.125rem;
}

.paisa-loading-spinner-md {
  font-size: 1.75rem;
}

.paisa-loading-spinner-lg {
  font-size: 2.5rem;
}

.paisa-loading-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--paisa-muted-foreground);
}
</style>
