<script lang="ts">
  import type { Snippet } from "svelte";
  import LoadingState from "$lib/components/ui/LoadingState.svelte";
  import ErrorState from "$lib/components/ui/ErrorState.svelte";

  type PageWidth = "fluid" | "standard" | "narrow";

  interface Props {
    width?: PageWidth;
    loading?: boolean;
    loadingMessage?: string;
    error?: string | Error;
    onretry?: () => void;
    class?: string;
    children?: Snippet;
    empty?: Snippet;
  }

  let {
    width = "fluid",
    loading = false,
    loadingMessage = "Loading...",
    error,
    onretry,
    class: className = "",
    children,
    empty,
  }: Props = $props();

  const widthClasses: Record<PageWidth, string> = {
    fluid: "is-fluid",
    standard: "is-max-widescreen",
    narrow: "is-max-desktop",
  };
</script>

<section class="section py-4 px-3 paisa-page-section {className}">
  <div class="container {widthClasses[width]}">
    {#if loading}
      <LoadingState fullscreen message={loadingMessage} />
    {:else if error}
      <ErrorState
        message={typeof error === "string" ? error : error?.message}
        {onretry}
      />
    {:else if empty}
      {@render empty()}
    {:else}
      {@render children?.()}
    {/if}
  </div>
</section>

<style>
  .paisa-page-section {
    min-height: calc(100vh - 4rem);
  }
</style>
