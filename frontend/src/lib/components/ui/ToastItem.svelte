<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { dismissToast, type ToastMessage } from "$lib/core/toast";

  export let item: ToastMessage;
  let timer: number;
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
  on:mouseenter={() => item.pauseOnHover && pause()}
  on:mouseleave={() => item.pauseOnHover && resume()}
  on:click={() => item.closeOnClick !== false && dismissToast(item.id)}
>
  {#if item.dismissible}
    <button class="delete" aria-label="Dismiss notification" on:click|stopPropagation={() => dismissToast(item.id)} />
  {/if}
  {@html item.message}
</div>
