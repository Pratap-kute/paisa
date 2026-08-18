<script lang="ts">
  import type { Snippet } from "svelte";
  import _ from "lodash";

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
    (typeof item !== "boolean" && _.isEmpty(item))
  );
</script>

{#if shouldShow}
  <div class="paisa-empty-state has-text-centered p-6">
    {#if iconSnippet}
      <div class="paisa-empty-icon mb-3">
        {@render iconSnippet()}
      </div>
    {:else if icon}
      <div class="paisa-empty-icon mb-3 has-text-grey-light">
        <span class="icon is-large is-size-1">
          <i class="fas {icon}"></i>
        </span>
      </div>
    {/if}

    {#if title}
      <h3 class="title is-5 mb-2 has-text-weight-bold">{title}</h3>
    {/if}

    {#if description}
      <p class="subtitle is-6 has-text-grey mb-4">{description}</p>
    {/if}

    {#if children}
      <div class="paisa-empty-content mb-4">
        {@render children()}
      </div>
    {/if}

    {#if actions}
      <div class="paisa-empty-actions is-flex is-justify-content-center gap-2 mt-4">
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
  }
</style>
