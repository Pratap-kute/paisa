<script lang="ts">
import type { Snippet } from "svelte";
import { iconGlyphOr } from "$lib/shared/ui/icon";

interface Props {
  title?: string;
  titleIcon?: string;
  subtitle?: string;
  titleHref?: string;
  fill?: boolean;
  class?: string;
  action?: Snippet;
  children?: Snippet;
}

let {
  title,
  titleIcon,
  subtitle,
  titleHref,
  fill = false,
  class: className = "",
  action,
  children,
}: Props = $props();
</script>

<section class="paisa-section {fill ? 'paisa-section-fill' : ''} {className}">
  {#if title || action || subtitle}
    <div class="paisa-section-header">
      <div class="paisa-section-heading">
        {#if title}
          <div class="paisa-section-title-wrap">
            {#if titleHref}
              <a class="paisa-section-title-link" href={titleHref}>
                {#if titleIcon}<span class="custom-icon" aria-hidden="true">{iconGlyphOr(titleIcon)}</span>{/if}
                <span>{title}</span>
              </a>
            {:else}
              <span class="paisa-section-title">
                {#if titleIcon}<span class="custom-icon" aria-hidden="true">{iconGlyphOr(titleIcon)}</span>{/if}
                <span>{title}</span>
              </span>
            {/if}
          </div>
        {/if}
        {#if subtitle}
          <p class="paisa-section-subtitle">{subtitle}</p>
        {/if}
      </div>
      {#if action}
        <div class="paisa-section-action">
          {@render action()}
        </div>
      {/if}
    </div>
  {/if}
  <div class="paisa-section-content">
    {@render children?.()}
  </div>
</section>

<style>
.paisa-section {
  min-width: 0;
  margin-bottom: var(--paisa-space-5);
}

.paisa-section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--paisa-space-2);
  gap: var(--paisa-space-3);
  flex-wrap: wrap;
}

.paisa-section-heading {
  min-width: 0;
}

.paisa-section-title,
.paisa-section-title-link {
  font-size: var(--paisa-font-size-sm);
  font-weight: var(--paisa-font-weight-semibold);
  color: var(--paisa-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: var(--paisa-line-height-tight);
  transition: color var(--paisa-transition-fast);
}

.paisa-section-title-link:hover {
  color: var(--paisa-brand-primary);
}

.paisa-section-title,
.paisa-section-title-link {
  display: inline-flex;
  align-items: center;
  gap: var(--paisa-space-2);
}

.paisa-section-subtitle {
  font-size: var(--paisa-font-size-xs);
  color: var(--paisa-text-muted);
  margin-top: var(--paisa-space-1);
  margin-bottom: 0;
}

.paisa-section-action {
  display: flex;
  align-items: center;
  gap: var(--paisa-space-2);
}

.paisa-section-content {
  min-width: 0;
}

.paisa-section-fill {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

.paisa-section-fill .paisa-section-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
