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
  <Navbar bind:isBurger />

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
    background-color: var(--paisa-canvas-bg);
  }
  .paisa-main-content {
    flex: 1 1 auto;
    min-width: 0;
  }
</style>
