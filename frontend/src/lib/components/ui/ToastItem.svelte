<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { dismissToast, type ToastMessage } from "$lib/core/toast";

  interface Props {
    item: ToastMessage;
  }

  let { item }: Props = $props();
  let timer: number;
  // svelte-ignore state_referenced_locally
  let remaining = item.duration ?? 2000;
  let started = 0;

  function resume() {
    started = Date.now();
    timer = window.setTimeout(() => dismissToast(item.id), remaining);
  }

  function pause() {
    window.clearTimeout(timer);
    remaining = Math.max(0, remaining - (Date.now() - started));
  }

  onMount(resume);
  onDestroy(() => window.clearTimeout(timer));
</script>

<div
  class="notification {item.type || ''} {item.extraClasses || ''}"
  role={item.type === "is-danger" ? "alert" : "status"}
  onmouseenter={() => item.pauseOnHover && pause()}
  onmouseleave={() => item.pauseOnHover && resume()}
  onclick={() => item.closeOnClick !== false && dismissToast(item.id)}
>
  {#if item.dismissible}
    <button
      class="delete"
      aria-label="Dismiss notification"
      onclick={(e) => {
        e.stopPropagation();
        dismissToast(item.id);
      }}
    ></button>
  {/if}
  {@html item.message}
</div>
