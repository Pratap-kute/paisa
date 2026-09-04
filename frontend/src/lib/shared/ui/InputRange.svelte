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
  <div
  class="inline-flex h-8 items-center gap-1.5 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface px-2 py-0.5 text-xs text-foreground shadow-xs">
  <span
    class="font-semibold text-muted-foreground text-[0.6875rem] uppercase tracking-wider">{label}</span>
  <div
    class="inline-flex items-center rounded-[var(--paisa-radius-sm)] bg-surface-hover p-0.5 border border-border-subtle">
      {#each range(allowed.min, allowed.max + 1) as i}
        <button
          type="button"
          class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-[2px] px-1 text-[0.6875rem] font-bold transition-all {value === i ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-surface'}"
          onclick={() => (value = i)}
          aria-label="{label} depth {i}"
        >
          {i}
        </button>
      {/each}
    </div>
</div>
{/if}
