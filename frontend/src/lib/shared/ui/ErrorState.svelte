<script lang="ts">
import type { Snippet } from "svelte";
import Button from "./Button.svelte";

interface Props {
  title?: string;
  message?: string;
  onretry?: () => void;
  retryText?: string;
  actions?: Snippet;
  children?: Snippet;
}

let {
  title = "Something went wrong",
  message = "An error occurred while loading data. Please try again.",
  onretry,
  retryText = "Try Again",
  actions,
  children,
}: Props = $props();
</script>

<div class="paisa-error-state" role="alert">
  <div class="paisa-error-icon">
    <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
  </div>
  {#if title}
    <h3 class="paisa-error-title">{title}</h3>
  {/if}
  {#if message}
    <p class="paisa-error-message">{message}</p>
  {/if}
  {#if children}
    <div class="paisa-error-content">
      {@render children()}
    </div>
  {/if}
  {#if onretry || actions}
    <div class="paisa-error-actions">
      {#if onretry}
        <Button variant="danger" size="sm" onclick={onretry}>
          {#snippet icon()}
            <i class="fas fa-arrow-rotate-right"></i>
          {/snippet}
          {retryText}
        </Button>
      {/if}
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  {/if}
</div>

<style>
.paisa-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0 auto;
  max-width: 32rem;
  padding: var(--paisa-space-6, 2rem);
  text-align: center;
}

.paisa-error-icon {
  margin-bottom: var(--paisa-space-3, 0.75rem);
  font-size: 2.5rem;
  line-height: 1;
  color: var(--paisa-negative);
}

.paisa-error-title {
  margin: 0 0 var(--paisa-space-2, 0.5rem);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--paisa-foreground);
}

.paisa-error-message {
  margin: 0 0 var(--paisa-space-4, 1rem);
  font-size: 0.875rem;
  color: var(--paisa-muted-foreground);
}

.paisa-error-content {
  margin-bottom: var(--paisa-space-4, 1rem);
}

.paisa-error-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--paisa-space-2, 0.5rem);
  margin-top: var(--paisa-space-2, 0.5rem);
}
</style>
