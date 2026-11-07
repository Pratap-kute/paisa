<script lang="ts">
  import { toastPosition, toasts } from "#lib/shared/ui/toast";
  import ToastItem from "./ToastItem.svelte";
</script>

<div
  class="paisa-toast-container"
  class:is-bottom={toastPosition.value === "bottom-right"}
  class:is-center={toastPosition.value === "center"}
  aria-live="polite"
>
  {#each toasts.value as item (item.id)}
    <ToastItem {item} />
  {/each}
</div>
