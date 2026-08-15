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

<div class="paisa-error-state has-text-centered p-6" role="alert">
  <div class="paisa-error-icon mb-3 has-text-danger">
    <span class="icon is-large is-size-1">
      <i class="fas fa-triangle-exclamation"></i>
    </span>
  </div>
  {#if title}
    <h3 class="title is-5 mb-2 has-text-weight-bold">{title}</h3>
  {/if}
  {#if message}
    <p class="subtitle is-6 has-text-grey mb-4">{message}</p>
  {/if}
  {#if children}
    <div class="paisa-error-content mb-4">
      {@render children()}
    </div>
  {/if}
  {#if onretry || actions}
    <div class="paisa-error-actions is-flex is-justify-content-center gap-2 mt-2">
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
  }
</style>
