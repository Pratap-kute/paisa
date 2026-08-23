<script lang="ts">
  import { range } from "es-toolkit";
  interface Props {
    label: string;
    value: number;
    allowed: { min: number; max: number };
  }

  let { label, value = $bindable(), allowed }: Props = $props();
</script>

{#if allowed && allowed.max > 1}
  <div class="inline-flex h-8 items-center gap-1.5 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-2 py-0.5 text-xs text-[var(--paisa-foreground)] shadow-xs">
    <span class="font-semibold text-[var(--paisa-muted-foreground)] text-[0.6875rem] uppercase tracking-wider">{label}</span>
    <div class="inline-flex items-center rounded-[var(--paisa-radius-sm)] bg-[var(--paisa-surface-hover)] p-0.5 border border-[var(--paisa-border-subtle)]">
      {#each range(allowed.min, allowed.max + 1) as i}
        <button
          type="button"
          class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-[2px] px-1 text-[0.6875rem] font-bold transition-all {value === i ? 'bg-[var(--paisa-primary)] text-white shadow-xs' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-foreground)] hover:bg-[var(--paisa-surface)]'}"
          onclick={() => (value = i)}
          aria-label="{label} depth {i}"
        >
          {i}
        </button>
      {/each}
    </div>
  </div>
{/if}
