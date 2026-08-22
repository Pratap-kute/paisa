<script lang="ts">
  import { now } from "$lib/core/utils";
  import dayjs from "dayjs";
  import _ from "lodash";

  interface Props {
    min: dayjs.Dayjs;
    max: dayjs.Dayjs;
    value: string;
  }

  let { min, max, value = $bindable() }: Props = $props();

  let open = $state(false);
  let valueDate = $derived(dayjs(value, "YYYY-MM"));
  let selectedYear: number = $state(dayjs(value, "YYYY-MM").year());
  let allowedYears: number[] = $derived(
    min && max ? _.range(min.year(), max.year() + 1) : []
  );

  $effect(() => {
    selectedYear = valueDate.year();
  });

  $effect(() => {
    if (min && max && !isAllowed(valueDate, min, max)) {
      if (isAllowed(now(), min, max)) {
        select(now());
      } else {
        select(max);
      }
    }
  });

  function isAllowed(date: dayjs.Dayjs, minDate: dayjs.Dayjs, maxDate: dayjs.Dayjs) {
    return date.isSameOrAfter(minDate.startOf("month")) && date.isSameOrBefore(maxDate.endOf("month"));
  }

  function select(date: dayjs.Dayjs) {
    value = date.format("YYYY-MM");
    selectedYear = date.year();
    open = false;
  }

  function selectMonth(month: number) {
    select(dayjs(`${selectedYear}-${month + 1}`, "YYYY-M"));
  }

  function selectYear(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedYear = parseInt(target.value);
  }

  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
</script>

<div class="inline-flex items-stretch">
  <button
    type="button"
    class="paisa-month-nav border-r border-[var(--paisa-border-subtle)]"
    aria-label="Previous month"
    disabled={!isAllowed(valueDate.add(-1, "month"), min, max)}
    onclick={() => select(valueDate.add(-1, "month"))}
  >
    <i class="fas fa-chevron-left" aria-hidden="true"></i>
  </button>

  <div class="relative">
    <button
      type="button"
      class="paisa-month-trigger"
      aria-label="Select month and year"
      aria-haspopup="listbox"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <span class="font-semibold">{valueDate.format("MMM YYYY")}</span>
      <i class="fas fa-angle-down text-xs" aria-hidden="true"></i>
    </button>

    {#if open}
      <button
        type="button"
        class="fixed inset-0 z-40 cursor-default border-0 bg-transparent p-0"
        aria-label="Close month picker"
        onclick={() => (open = false)}
      ></button>
      <div
        class="absolute left-0 top-full z-50 mt-1 min-w-[16rem] overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] shadow-[var(--paisa-shadow-lg)]"
        role="listbox"
      >
        <div class="border-b border-[var(--paisa-border-subtle)] p-2">
          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="paisa-month-nav"
              aria-label="Previous year"
              disabled={selectedYear - 1 < min.year()}
              onclick={() => selectedYear--}
            >
              <i class="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            <select
              class="paisa-month-year-select"
              aria-label="Select year"
              value={selectedYear}
              onchange={(e) => selectYear(e)}
            >
              {#each allowedYears as year}
                <option value={year}>{year}</option>
              {/each}
            </select>
            <button
              type="button"
              class="paisa-month-nav"
              aria-label="Next year"
              disabled={selectedYear + 1 > max.year()}
              onclick={() => selectedYear++}
            >
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1 p-2">
          {#each MONTHS as month, i}
            {#if isAllowed(dayjs(`${selectedYear}-${i + 1}`, "YYYY-M"), min, max)}
              <button
                type="button"
                class="rounded-[var(--paisa-radius-sm)] px-2 py-2 text-sm transition-colors hover:bg-[var(--paisa-surface-hover)] {valueDate.year() == selectedYear && valueDate.month() == i ? 'bg-[var(--paisa-primary-subtle)] font-semibold text-[var(--paisa-primary)]' : 'text-[var(--paisa-foreground)]'}"
                onclick={() => selectMonth(i)}
              >{month}</button>
            {:else}
              <span class="px-2 py-2 text-center text-sm text-[var(--paisa-muted-foreground)] opacity-50">{month}</span>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <button
    type="button"
    class="paisa-month-nav border-l border-[var(--paisa-border-subtle)]"
    aria-label="Next month"
    disabled={!isAllowed(valueDate.add(1, "month"), min, max)}
    onclick={() => select(valueDate.add(1, "month"))}
  >
    <i class="fas fa-chevron-right" aria-hidden="true"></i>
  </button>
</div>

<style>
  .paisa-month-nav,
  .paisa-month-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 2rem;
    min-width: 2rem;
    padding: 0 0.5rem;
    border: 0;
    background: var(--paisa-surface);
    color: var(--paisa-foreground);
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .paisa-month-nav:hover:not(:disabled),
  .paisa-month-trigger:hover {
    background: var(--paisa-surface-hover);
  }

  .paisa-month-nav:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .paisa-month-trigger {
    min-width: 7.5rem;
    padding: 0 0.75rem;
  }

  .paisa-month-year-select {
    appearance: none;
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-sm);
    background: var(--paisa-surface);
    color: var(--paisa-foreground);
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
  }
</style>
