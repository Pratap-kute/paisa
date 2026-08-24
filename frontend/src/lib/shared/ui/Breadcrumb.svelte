<script lang="ts">
  import { helpUrl } from "$lib/core/utils";
  import Badge from "./Badge.svelte";

  export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: string;
    tag?: string;
    help?: string;
    active?: boolean;
  }

  interface Props {
    items: BreadcrumbItem[];
    class?: string;
  }

  let { items, class: className = "" }: Props = $props();
</script>

<nav class="paisa-breadcrumb {className}" aria-label="breadcrumbs">
  <ul class="paisa-breadcrumb-list">
    {#each items as item, index}
      <li class="paisa-breadcrumb-item {index === items.length - 1 || item.active ? 'paisa-breadcrumb-item-active' : ''}">
        {#if item.href && index < items.length - 1 && !item.active}
          <a href={item.href} class="paisa-breadcrumb-link">
            {#if item.icon}
              <span class="paisa-breadcrumb-icon" aria-hidden="true"><i class="fas {item.icon}"></i></span>
            {/if}
            <span>{item.label}</span>
          </a>
        {:else}
          <span class="paisa-breadcrumb-current">
            {#if item.icon}
              <span class="paisa-breadcrumb-icon" aria-hidden="true"><i class="fas {item.icon}"></i></span>
            {/if}
            <span>{item.label}</span>
          </span>
        {/if}

        {#if item.help}
          <a
            class="paisa-breadcrumb-help"
            aria-label="Help documentation"
            href={helpUrl(item.help)}
          >
            <span class="paisa-breadcrumb-icon" aria-hidden="true">
              <i class="fas fa-circle-question"></i>
            </span>
          </a>
        {/if}

        {#if item.tag}
          <Badge variant="warning" rounded class="paisa-breadcrumb-tag">{item.tag}</Badge>
        {/if}
      </li>
    {/each}
  </ul>
</nav>

<style>
  .paisa-breadcrumb {
    margin-bottom: 0;
    font-size: 0.8125rem;
    line-height: var(--paisa-line-height-normal, 1.5);
  }

  .paisa-breadcrumb-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .paisa-breadcrumb-item {
    display: inline-flex;
    align-items: center;
    line-height: var(--paisa-line-height-normal, 1.5);
  }

  .paisa-breadcrumb-item + .paisa-breadcrumb-item::before {
    display: inline-flex;
    align-items: center;
    padding: 0 0.4rem;
    font-family: "Font Awesome 6 Free";
    font-weight: 900;
    font-size: 0.55rem;
    content: "\f054";
    color: var(--paisa-breadcrumb-separator);
    opacity: 0.7;
    vertical-align: middle;
  }

  .paisa-breadcrumb-link,
  .paisa-breadcrumb-current {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--paisa-breadcrumb-muted);
    text-decoration: none;
    padding: 0 0.35rem;
    letter-spacing: 0.01em;
  }

  .paisa-breadcrumb-item:first-child .paisa-breadcrumb-link,
  .paisa-breadcrumb-item:first-child .paisa-breadcrumb-current {
    padding-left: 0;
  }

  .paisa-breadcrumb-link:hover {
    color: var(--paisa-primary);
  }

  .paisa-breadcrumb-item-active .paisa-breadcrumb-current {
    color: var(--paisa-foreground);
    cursor: default;
    pointer-events: none;
  }

  .paisa-breadcrumb-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: var(--paisa-font-size-xs, 0.75rem);
    margin-top: -1px;
  }

  .paisa-breadcrumb-help {
    display: inline-flex;
    align-items: center;
    margin-left: 0.25rem;
    padding: 0;
    color: var(--paisa-muted-foreground);
    text-decoration: none;
  }

  .paisa-breadcrumb-help:hover {
    color: var(--paisa-primary);
  }

  :global(.paisa-breadcrumb-tag) {
    margin-left: 0.375rem;
    font-size: 0.625rem;
    vertical-align: middle;
  }
</style>
