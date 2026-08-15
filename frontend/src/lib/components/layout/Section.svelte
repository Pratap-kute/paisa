<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title?: string;
    subtitle?: string;
    titleHref?: string;
    class?: string;
    action?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    subtitle,
    titleHref,
    class: className = "",
    action,
    children,
  }: Props = $props();
</script>

<section class="paisa-section mb-5 {className}">
  {#if title || action || subtitle}
    <div class="paisa-section-header mb-2 is-flex is-justify-content-space-between is-align-items-baseline">
      <div>
        {#if title}
          <p class="subtitle mb-0">
            {#if titleHref}
              <a class="secondary-link has-text-grey" href={titleHref}>{title}</a>
            {:else}
              <span class="has-text-grey has-text-weight-bold is-size-6">{title}</span>
            {/if}
          </p>
        {/if}
        {#if subtitle}
          <p class="is-size-7 has-text-grey">{subtitle}</p>
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
  }
  p.subtitle a.secondary-link {
    text-transform: uppercase;
    font-size: 0.95rem;
    letter-spacing: 0.025em;
  }
</style>
