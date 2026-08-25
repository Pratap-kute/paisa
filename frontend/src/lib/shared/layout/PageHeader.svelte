<script lang="ts">
import type { Snippet } from "svelte";
import { helpUrl } from "$lib/shared/browser/navigation";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  title: string;
  description?: string;
  help?: string;
  tag?: string;
  badgeVariant?:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral";
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

<div class="paisa-page-header {className}">
  <div class="paisa-page-header-row">
    <div class="paisa-page-header-main">
      {#if leading}
        <div class="paisa-page-header-leading">
          {@render leading()}
        </div>
      {/if}
      <div>
        <div class="paisa-page-header-title-row">
          <h1 class="paisa-page-title">{title}</h1>
          {#if help}
            <a
              class="paisa-help-link"
              aria-label="{title} documentation"
              href={helpUrl(help)}
              target="_blank"
              rel="noreferrer"
            >
              <span class="inline-flex items-center text-xs">
                <i class="fas fa-circle-question"></i>
              </span>
            </a>
          {/if}
          {#if tag}
            <Badge variant={badgeVariant} rounded size="sm">{tag}</Badge>
          {/if}
        </div>
        {#if description}
          <p class="paisa-page-description">{description}</p>
        {/if}
      </div>
    </div>

    {#if actions}
      <div class="paisa-page-header-actions">
        {@render actions()}
      </div>
    {/if}
  </div>

  {#if children}
    <div class="paisa-page-header-children">
      {@render children()}
    </div>
  {/if}
</div>

<style>
.paisa-page-header {
  width: 100%;
  margin-bottom: var(--paisa-space-5);
}

.paisa-page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--paisa-space-3);
}

.paisa-page-header-main {
  display: flex;
  align-items: flex-start;
  gap: var(--paisa-space-3);
  min-width: 0;
}

.paisa-page-header-leading {
  margin-top: 0.125rem;
}

.paisa-page-header-title-row {
  display: flex;
  align-items: center;
  gap: var(--paisa-space-2);
  flex-wrap: wrap;
}

.paisa-page-title {
  margin: 0;
  font-size: var(--paisa-font-size-xl);
  font-weight: var(--paisa-font-weight-bold);
  color: var(--paisa-text-primary);
  line-height: var(--paisa-line-height-tight);
}

.paisa-help-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--paisa-text-muted, var(--paisa-muted-foreground));
  transition: color var(--paisa-transition-fast);
}

.paisa-help-link:hover {
  color: var(--paisa-brand-primary, var(--paisa-primary));
}

.paisa-page-description {
  font-size: var(--paisa-font-size-sm);
  color: var(--paisa-text-secondary);
  margin-top: var(--paisa-space-1);
  margin-bottom: 0;
}

.paisa-page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--paisa-space-2);
}

.paisa-page-header-children {
  margin-top: var(--paisa-space-3);
}
</style>
