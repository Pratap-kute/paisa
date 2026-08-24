<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    item?: any;
    title?: string;
    description?: string;
    icon?: string;
    iconSnippet?: Snippet;
    actions?: Snippet;
    children?: Snippet;
  }

  let {
    item = null,
    title,
    description,
    icon,
    iconSnippet,
    actions,
    children,
  }: Props = $props();

  let shouldShow = $derived(
    item === null ||
    item === undefined ||
    item === false ||
    (typeof item === "string" && item.trim().length === 0) ||
    (Array.isArray(item) && item.length === 0) ||
    (typeof item === "object" && item !== null && Object.keys(item).length === 0)
  );
</script>

{#if shouldShow}
  <div class="paisa-empty-state">
    {#if iconSnippet}
      <div class="paisa-empty-icon">
        {@render iconSnippet()}
      </div>
    {:else if icon}
      <div class="paisa-empty-icon paisa-empty-icon-default">
        <i class="fas {icon}" aria-hidden="true"></i>
      </div>
    {/if}

    {#if title}
      <h3 class="paisa-empty-title">{title}</h3>
    {/if}

    {#if description}
      <p class="paisa-empty-description">{description}</p>
    {/if}

    {#if children}
      <div class="paisa-empty-content">
        {@render children()}
      </div>
    {/if}

    {#if actions}
      <div class="paisa-empty-actions">
        {@render actions()}
      </div>
    {/if}
  </div>
{/if}

<style>
  .paisa-empty-state {
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

  .paisa-empty-icon {
    margin-bottom: var(--paisa-space-3, 0.75rem);
  }

  .paisa-empty-icon-default {
    font-size: 2.5rem;
    color: var(--paisa-muted-foreground);
    line-height: 1;
  }

  .paisa-empty-title {
    margin: 0 0 var(--paisa-space-2, 0.5rem);
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--paisa-foreground);
  }

  .paisa-empty-description {
    margin: 0 0 var(--paisa-space-4, 1rem);
    font-size: 0.875rem;
    color: var(--paisa-muted-foreground);
  }

  .paisa-empty-content {
    margin-bottom: var(--paisa-space-4, 1rem);
  }

  .paisa-empty-actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-2, 0.5rem);
    margin-top: var(--paisa-space-4, 1rem);
  }
</style>
