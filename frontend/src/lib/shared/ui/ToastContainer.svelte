<script lang="ts">
  import { toasts, toastPosition } from "$lib/shared/ui/toast";
  import ToastItem from "./ToastItem.svelte";
</script>

<div
  class="paisa-toast-container"
  class:is-bottom={$toastPosition === "bottom-right"}
  class:is-center={$toastPosition === "center"}
  aria-live="polite"
>
  {#each $toasts as item (item.id)}
    <ToastItem {item} />
  {/each}
</div>
