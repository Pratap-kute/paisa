<script lang="ts">
  import type { Snippet } from "svelte";
  import Navbar from "./Navbar.svelte";
  import Spinner from "$lib/components/ui/Spinner.svelte";

  interface Props {
    isBurger?: boolean;
    children?: Snippet;
  }

  let { isBurger = $bindable(null), children }: Props = $props();
</script>

<div class="paisa-app-shell">
  <div class="paisa-app-header">
    <Navbar bind:isBurger />
  </div>

  <main class="paisa-main-content">
    <Spinner>
      {@render children?.()}
    </Spinner>
  </main>
</div>

<style>
  .paisa-app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    background-color: var(--paisa-canvas-bg);
  }
  .paisa-app-header {
    position: relative;
    z-index: 40;
  }
  .paisa-main-content {
    position: relative;
    z-index: 0;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
