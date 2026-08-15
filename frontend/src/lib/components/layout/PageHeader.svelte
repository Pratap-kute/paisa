<script lang="ts">
  import type { Snippet } from "svelte";
  import { helpUrl } from "$lib/core/utils";
  import Badge from "$lib/components/ui/Badge.svelte";

  interface Props {
    title: string;
    description?: string;
    help?: string;
    tag?: string;
    badgeVariant?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
    class?: string;
    actions?: Snippet;
    leading?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    description,
    help,
    tag,
    badgeVariant = "warning",
    class: className = "",
    actions,
    leading,
    children,
  }: Props = $props();
</script>

<div class="paisa-page-header mb-4 {className}">
  <div class="is-flex is-justify-content-space-between is-align-items-flex-start is-flex-wrap-wrap gap-3">
    <div class="paisa-page-header-main is-flex is-align-items-flex-start gap-2">
      {#if leading}
        <div class="paisa-page-header-leading mt-1">
          {@render leading()}
        </div>
      {/if}
      <div>
        <div class="is-flex is-align-items-center gap-2">
          <h1 class="title is-4 mb-0 has-text-weight-bold">{title}</h1>
          {#if help}
            <a
              class="p-0 has-text-grey"
              aria-label="{title} documentation"
              href={helpUrl(help)}
              target="_blank"
              rel="noreferrer"
            >
              <span class="icon is-small">
                <i class="fas fa-circle-question"></i>
              </span>
            </a>
          {/if}
          {#if tag}
            <Badge variant={badgeVariant} rounded size="sm">{tag}</Badge>
          {/if}
        </div>
        {#if description}
          <p class="subtitle is-6 has-text-grey mt-1 mb-0">{description}</p>
        {/if}
      </div>
    </div>

    {#if actions}
      <div class="paisa-page-header-actions is-flex is-align-items-center gap-2">
        {@render actions()}
      </div>
    {/if}
  </div>

  {#if children}
    <div class="paisa-page-header-children mt-3">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .paisa-page-header {
    width: 100%;
  }
  .paisa-page-header-main {
    min-width: 0;
  }
</style>
