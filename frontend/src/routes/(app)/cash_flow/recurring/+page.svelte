<script lang="ts">
import RecurringIntelligence from "$lib/features/cash_flow/components/RecurringIntelligence.svelte";
import { isMobile } from "$lib/shared/browser/responsive";
import { monthDays } from "$lib/domain/time";
import type { TransactionSchedule } from "$lib/domain/recurring";
import type { TransactionSequence } from "$lib/domain/recurring";
import {
  enrichTrantionSequence,
  nextUnpaidSchedule,
  sortTrantionSequence,
} from "$lib/domain/transaction_sequence";
import { helpUrl } from "$lib/shared/browser/navigation";
import { api } from "$lib/api";
import { compact, flatMap, groupBy } from "es-toolkit";
import { onMount } from "svelte";
import RecurringCard from "$lib/features/cash_flow/components/RecurringCard.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import { month, setAllowedDateRange } from "../../../../store";
import type { Dayjs } from "dayjs";
import RecurringDay from "$lib/features/cash_flow/components/RecurringDay.svelte";
import dayjs from "dayjs";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import { isEmpty as isEmptyValue } from "$lib/shared/utils/collection";
import { get } from "svelte/store";
import { page } from "$app/state";
import { validPeriod } from "$lib/shared/browser/period";

let transactionSequences: TransactionSequence[] = $state([]);
let transactionSequencesDelayed: TransactionSequence[] = $state([]);
let isEmpty = $state(false);
let isLoading = $state(true);
let loadError = $state("");
let requestedPeriod = $derived(
  validPeriod(page.url.searchParams.get("period")),
);
const fallbackMonth = get(month);

$effect(() => {
  month.set(requestedPeriod ?? fallbackMonth);
});

let days: Dayjs[] = $derived(monthDays($month).days);
let schedulesByDate: Record<string, TransactionSchedule[]> = $derived(
  groupBy(
    transactionSequences.flatMap(
      (ts) => (ts.schedulesByMonth && ts.schedulesByMonth[$month]) || [],
    ),
    (s) => s.scheduled.format("YYYY-MM-DD"),
  ),
);

async function loadRecurring() {
  loadError = "";
  try {
    const res = await api.recurring.getRecurringTransactions();
    transactionSequences =
      (res.transaction_sequences as unknown as TransactionSequence[]) || [];

    isEmpty = isEmptyValue(transactionSequences);

    transactionSequences = sortTrantionSequence(
      enrichTrantionSequence(transactionSequences),
    );

    setAllowedDateRange(
      compact(
        flatMap(
          transactionSequences,
          (ts) => ts.schedules.map((s) => s.scheduled),
        ),
      ),
    );

    transactionSequencesDelayed = transactionSequences;
  } catch (error) {
    loadError =
      "Recurring transactions could not be loaded. Please reload the page.";
    throw error;
  } finally {
    isLoading = false;
  }
}
onMount(() => {
  void loadRecurring().catch(() => {/* The page displays loadError. */});
});
</script>

<svelte:head>
  <title>Recurring Transactions - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title="Recurring Transactions"
    description="Track scheduled payments, bills, and subscriptions"
  />

  {#if loadError}<p role="alert" class="text-sm text-negative">{loadError}</p>{/if}
  <RecurringIntelligence sequences={transactionSequences}
    onreload={loadRecurring} />

  <details>
    <summary class="cursor-pointer text-primary">Calendar and scheduled history</summary>
  {#if !isEmpty}
    <Section title="Calendar" subtitle="Scheduled recurring items for the selected month">
      <div
        class="mb-3 hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid"
      >
        {#each dayjs.weekdaysShort(true) as day}
          <div>{day}</div>
        {/each}
      </div>
      <div
        class="grid grid-cols-1 gap-2 overflow-y-auto pb-1 md:grid-cols-7"
        style={isMobile() ? "" : "height: calc(100vh - 200px);"}
      >
        {#each days as day (day)}
          <RecurringDay
            month={$month}
            {day}
            schedules={schedulesByDate[day.format("YYYY-MM-DD")] || []}
          />
        {/each}
      </div>
    </Section>
  {/if}

  <Section title="Recurring Schedules" subtitle="Next unpaid occurrence for each recurring item">
    <ZeroState item={!isEmpty}>
      <strong>Oops!</strong> You haven't configured any recurring transactions yet. Checkout the
      <a href={helpUrl("recurring")}>docs</a> page to get started.
    </ZeroState>

    {#if isLoading && !isEmpty}
      <div class="flex flex-col gap-3" aria-hidden="true">
        {#each Array(4) as _}
          <div class="h-16 animate-pulse rounded-lg bg-surface-hover"></div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each transactionSequencesDelayed as ts (ts.key)}
          <div id={ts.key === page.url.searchParams.get("key") ? "insight-recurring" : undefined}>
            <RecurringCard {ts} schedule={nextUnpaidSchedule(ts)} />
          </div>
        {/each}
      </div>
    {/if}
  </Section>
  </details>
</Page>
