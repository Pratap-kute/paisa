<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title?: string;
    subtitle?: string;
    titleHref?: string;
    fill?: boolean;
    class?: string;
    action?: Snippet;
    children?: Snippet;
  }

  let {
    title,
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
              <a class="paisa-section-title-link" href={titleHref}>{title}</a>
            {:else}
              <span class="paisa-section-title">{title}</span>
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

<style lang="scss">
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
