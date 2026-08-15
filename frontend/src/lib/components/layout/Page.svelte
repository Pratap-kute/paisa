<script lang="ts">
  import type { Snippet } from "svelte";
  import LoadingState from "$lib/components/ui/LoadingState.svelte";
  import ErrorState from "$lib/components/ui/ErrorState.svelte";

  type PageWidth = "fluid" | "analysis" | "standard" | "narrow";

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
    fluid: "paisa-page-fluid",
    analysis: "paisa-page-analysis",
    standard: "paisa-page-standard",
    narrow: "paisa-page-narrow",
  };
</script>

<div class="paisa-page-container {className}">
  <div class="paisa-page-content {widthClasses[width]}">
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
</div>

<style lang="scss">
  .paisa-page-container {
    width: 100%;
    min-height: calc(100vh - 3.5rem);
    padding: var(--paisa-space-4) var(--paisa-space-4) var(--paisa-space-6);

    @media screen and (max-width: 768px) {
      padding: var(--paisa-space-3) var(--paisa-space-3) var(--paisa-space-5);
    }
  }

  .paisa-page-content {
    width: 100%;
    margin: 0 auto;
  }

  .paisa-page-fluid {
    max-width: 100%;
  }

  .paisa-page-analysis {
    max-width: 1600px;
  }

  .paisa-page-standard {
    max-width: 1344px;
  }

  .paisa-page-narrow {
    max-width: 960px;
  }
</style>
