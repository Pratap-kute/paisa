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

<nav class="breadcrumb has-chevron-separator is-small mb-0 {className}" aria-label="breadcrumbs">
  <ul>
    {#each items as item, index}
      <li class={index === items.length - 1 || item.active ? "is-active" : ""}>
        {#if item.href && index < items.length - 1 && !item.active}
          <a href={item.href} class="is-inline-flex is-align-items-center">
            {#if item.icon}
              <span class="icon is-small mr-1"><i class="fas {item.icon}"></i></span>
            {/if}
            <span>{item.label}</span>
          </a>
        {:else}
          <span class="is-inactive is-inline-flex is-align-items-center">
            {#if item.icon}
              <span class="icon is-small mr-1"><i class="fas {item.icon}"></i></span>
            {/if}
            <span>{item.label}</span>
          </span>
        {/if}

        {#if item.help}
          <a
            class="p-0 ml-1 has-text-grey"
            aria-label="Help documentation"
            href={helpUrl(item.help)}
          >
            <span class="icon is-small">
              <i class="fas fa-circle-question"></i>
            </span>
          </a>
        {/if}

        {#if item.tag}
          <Badge variant="warning" rounded class="is-small ml-1.5">{item.tag}</Badge>
        {/if}
      </li>
    {/each}
  </ul>
</nav>
