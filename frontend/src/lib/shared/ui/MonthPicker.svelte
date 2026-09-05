<script lang="ts">
import { now } from "$lib/domain/time";
import dayjs from "dayjs";

interface Props {
  min: dayjs.Dayjs;
  max: dayjs.Dayjs;
  value: string;
  onchange?: (value: string) => void;
}

let { min, max, value = $bindable(), onchange }: Props = $props();

let open = $state(false);
let valueDate = $derived(dayjs(value, "YYYY-MM"));
let selectedYear: number = $state(dayjs(value, "YYYY-MM").year());
let allowedYears: number[] = $derived(
  min && max
    ? Array.from(
      { length: max.year() - min.year() + 1 },
      (_, i) => min.year() + i,
    )
    : [],
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

function isAllowed(
  date: dayjs.Dayjs,
  minDate: dayjs.Dayjs,
  maxDate: dayjs.Dayjs,
) {
  return date.isSameOrAfter(minDate.startOf("month")) &&
    date.isSameOrBefore(maxDate.endOf("month"));
}

function select(date: dayjs.Dayjs) {
  value = date.format("YYYY-MM");
  onchange?.(value);
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
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
</script>

<div
  class="relative inline-flex h-8 items-stretch rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface shadow-xs">
  <button
    type="button"
    class="paisa-month-nav rounded-l-[calc(var(--paisa-radius-md)-1px)] border-r border-border-subtle"
    aria-label="Previous month"
    disabled={!isAllowed(valueDate.add(-1, "month"), min, max)}
    onclick={() => select(valueDate.add(-1, "month"))}
  >
    <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
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
      <i class="fas fa-calendar-days text-xs text-muted-foreground" aria-hidden="true"></i>
      <span class="font-semibold text-xs">{valueDate.format("MMM YYYY")}</span>
      <i class="fas fa-angle-down text-[0.625rem] text-muted-foreground transition-transform duration-150 {open ? 'rotate-180' : ''}" aria-hidden="true"></i>
    </button>

    {#if open}
      <button
        type="button"
        class="fixed inset-0 z-40 cursor-default border-0 bg-transparent p-0"
        aria-label="Close month picker"
        onclick={() => (open = false)}
      ></button>
      <div
        class="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full z-50 mt-1 min-w-[16rem] overflow-hidden rounded-[var(--paisa-radius-md)] border border-border-subtle bg-[var(--paisa-surface-raised,var(--paisa-surface))] shadow-[var(--paisa-shadow-lg)]"
        role="listbox"
      >
        <div class="border-b border-border-subtle p-2">
          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="paisa-month-nav rounded border border-border-subtle"
              aria-label="Previous year"
              disabled={selectedYear - 1 < min.year()}
              onclick={() => selectedYear--}
            >
              <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
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
              class="paisa-month-nav rounded border border-border-subtle"
              aria-label="Next year"
              disabled={selectedYear + 1 > max.year()}
              onclick={() => selectedYear++}
            >
              <i class="fas fa-chevron-right text-xs" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1 p-2">
          {#each MONTHS as month, i}
            {#if isAllowed(dayjs(`${selectedYear}-${i + 1}`, "YYYY-M"), min, max)}
              <button
                type="button"
                class="rounded-[var(--paisa-radius-sm)] px-2 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover {valueDate.year() == selectedYear && valueDate.month() == i ? 'bg-primary-subtle font-semibold text-primary' : 'text-foreground'}"
                onclick={() => selectMonth(i)}
              >{month}</button>
            {:else}
              <span class="px-2 py-1.5 text-center text-xs text-muted-foreground opacity-40">{month}</span>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <button
    type="button"
    class="paisa-month-nav rounded-r-[calc(var(--paisa-radius-md)-1px)] border-l border-border-subtle"
    aria-label="Next month"
    disabled={!isAllowed(valueDate.add(1, "month"), min, max)}
    onclick={() => select(valueDate.add(1, "month"))}
  >
    <i class="fas fa-chevron-right text-xs" aria-hidden="true"></i>
  </button>
</div>

<style>
.paisa-month-nav,
.paisa-month-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 100%;
  min-width: 1.75rem;
  padding: 0 0.5rem;
  border: 0;
  background: var(--paisa-surface);
  color: var(--paisa-foreground);
  font-size: 0.8125rem;
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
  padding: 0 0.625rem;
}

.paisa-month-year-select {
  appearance: none;
  border: 1px solid var(--paisa-border-subtle);
  border-radius: var(--paisa-radius-sm);
  background: var(--paisa-surface);
  color: var(--paisa-foreground);
  font-weight: 600;
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
}
</style>
