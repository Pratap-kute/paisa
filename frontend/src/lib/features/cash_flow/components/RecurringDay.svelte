<script lang="ts">
import { now } from "$lib/domain/time";
import type { TransactionSchedule } from "$lib/domain/recurring";
import { isMobile } from "$lib/shared/browser/responsive";
import type { Dayjs } from "dayjs";
import RecurringSchedule from "./RecurringSchedule.svelte";

interface Props {
  month: string;
  day: Dayjs;
  schedules: TransactionSchedule[];
}

let { month, day, schedules }: Props = $props();
let isToday = $derived(day.isSame(now(), "day"));
let isCurrentMonth = $derived(day.format("YYYY-MM") === month);
</script>

<div
  class="min-h-[4.5rem] rounded-md border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] p-1 {isCurrentMonth
    ? ''
    : 'invisible max-md:hidden'}"
>
  <div class="mb-1 mt-1 text-center text-sm font-semibold">
    <span
      class="inline-flex min-w-[1.75rem] items-center justify-center px-2 py-1 {isToday
        ? 'rounded-full border border-[var(--paisa-primary)] text-[var(--paisa-primary)]'
        : 'text-[var(--paisa-muted-foreground)]'}"
    >
      {day.format(isMobile() ? "ddd D" : "D")}
    </span>
  </div>

  <div class="space-y-1">
    {#each schedules as schedule (schedule)}
      <RecurringSchedule {schedule} />
    {/each}
  </div>
</div>
