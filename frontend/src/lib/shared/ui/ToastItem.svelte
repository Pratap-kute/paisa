<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { dismissToast, type ToastMessage } from "$lib/shared/ui/toast";

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
  class="paisa-toast {item.type || ''} {item.extraClasses || ''}"
  role={item.type === "is-danger" ? "alert" : "status"}
  onmouseenter={() => item.pauseOnHover && pause()}
  onmouseleave={() => item.pauseOnHover && resume()}
  onclick={() => item.closeOnClick !== false && dismissToast(item.id)}
>
  {#if item.dismissible}
    <button
      class="paisa-toast-dismiss"
      aria-label="Dismiss notification"
      onclick={(e) => {
        e.stopPropagation();
        dismissToast(item.id);
      }}
    ></button>
  {/if}
  {@html item.message}
</div>

<style>
.paisa-toast {
  position: relative;
  display: inline-flex;
  width: auto;
  padding: 1.25rem 1.5rem;
  pointer-events: auto;
  white-space: pre-wrap;
  border-radius: var(--paisa-radius-md, 6px);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--paisa-foreground);
  background-color: var(--paisa-surface);
  border: 1px solid var(--paisa-border-subtle);
  box-shadow: var(--paisa-shadow-md);
  cursor: pointer;
}

.paisa-toast.is-danger {
  background-color: var(--paisa-negative-subtle, var(--paisa-danger-light));
  border-color: var(--paisa-negative);
  color: var(--paisa-negative);
}

.paisa-toast.is-success {
  background-color: var(--paisa-positive-subtle, var(--paisa-success-light));
  border-color: var(--paisa-positive, var(--paisa-success));
  color: var(--paisa-positive, var(--paisa-success));
}

.paisa-toast.is-warning {
  background-color: var(--paisa-warning-subtle, var(--paisa-warning-light));
  border-color: var(--paisa-warning);
  color: var(--paisa-warning);
}

.paisa-toast.is-info {
  background-color: var(--paisa-primary-subtle, var(--paisa-info-light));
  border-color: var(--paisa-primary, var(--paisa-info));
  color: var(--paisa-primary, var(--paisa-info));
}

.paisa-toast-dismiss {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  border-radius: var(--paisa-radius-full);
  background: transparent;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 150ms ease;
}

.paisa-toast-dismiss::before,
.paisa-toast-dismiss::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.75rem;
  height: 2px;
  background-color: currentColor;
  content: "";
}

.paisa-toast-dismiss::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.paisa-toast-dismiss::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.paisa-toast-dismiss:hover {
  opacity: 1;
}

.paisa-toast-dismiss:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
