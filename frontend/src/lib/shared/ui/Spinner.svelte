<script lang="ts">
import { fade } from "svelte/transition";
import { delayedLoading } from "../../../store";
import Logo from "$lib/shared/layout/Logo.svelte";
interface Props {
  children?: import("svelte").Snippet;
}

let { children }: Props = $props();
let size = 90;
</script>

<div class="paisa-spinner-shell">
  <div
    class="paisa-spinner-content"
    style={$delayedLoading ? "visibility: hidden" : ""}
  >
    {@render children?.()}
  </div>
  {#if $delayedLoading}
    <div class="circle-container" transition:fade={{ duration: 400 }}>
      <Logo {size} animation />
    </div>
  {/if}
</div>

<style>
.paisa-spinner-shell,
.paisa-spinner-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.circle-container {
  margin: auto;
  position: absolute;
  top: -45px;
  left: 0;
  bottom: 0;
  right: 0;
  height: 90px;
  width: 90px;
}
</style>
