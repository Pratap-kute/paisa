<script lang="ts">
import { onMount } from "svelte";
import { api } from "$lib/api";
import type { Transaction } from "$lib/domain/ledger";
import type { TransactionSequence } from "$lib/domain/recurring";
import {
  analyzeConfirmedRecurring,
  discoverRecurringCandidates,
  type RecurringAnalysis,
} from "$lib/domain/recurring_analysis";
import { now } from "$lib/domain/time";
import {
  prepareRecurringConfirmation,
  saveRecurringConfirmation,
} from "../recurring_confirmation";
import Section from "$lib/shared/layout/Section.svelte";
import RecurringIntelligenceRow from "./RecurringIntelligenceRow.svelte";
import RecurringSummary from "./RecurringSummary.svelte";
interface Props {
  sequences: TransactionSequence[];
  onreload: () => Promise<void>;
}
let { sequences, onreload }: Props = $props();
let history: Transaction[] = $state([]);
let rejected: string[] = $state([]);
let busy = $state(false);
let loading = $state(true);
let error = $state("");
let notice = $state("");
const asOf = now();
let confirmed = $derived(analyzeConfirmedRecurring(sequences, asOf));
let candidates = $derived(
  discoverRecurringCandidates(history, sequences, asOf).filter((c) =>
    !rejected.includes(c.key)
  ),
);
let attention = $derived(
  confirmed.filter((s) =>
    s.flags.amountChanged || s.flags.laterThanUsual || s.flags.cadenceChanged ||
    s.lifecycle === "new"
  ),
);
let upcoming = $derived(
  confirmed.flatMap((item) =>
    item.upcomingDates.map((date) => ({ item, date }))
  ).sort((a, b) => a.date.valueOf() - b.date.valueOf()),
);
async function loadHistory() {
  const response = await api.transaction.getTransactions();
  history = (response.transactions ?? []) as unknown as Transaction[];
}
onMount(async () => {
  try {
    await loadHistory();
  } catch {
    error =
      "Transaction history could not be loaded. Confirmed recurring items remain available.";
  } finally {
    loading = false;
  }
});
async function confirm(candidate: RecurringAnalysis) {
  busy = true;
  error = "";
  notice = "";
  try {
    const edits = await prepareRecurringConfirmation(
      candidate,
      USER_CONFIG.ledger_cli ?? "ledger",
    );
    await saveRecurringConfirmation(edits);
    await onreload();
    await loadHistory();
    notice =
      "Recurring tags saved to the ledger. Use the same tag on future occurrences, or configure a ledger automation rule.";
  } catch (e) {
    error = e instanceof Error
      ? e.message
      : "Could not confirm recurring transactions";
    try {
      await onreload();
      await loadHistory();
    } catch {
      error += " History refresh also failed; reload the page.";
    }
  } finally {
    busy = false;
  }
}
</script>
<Section title="Recurring commitments"
  subtitle={`As of ${asOf.format("D MMM YYYY")} · Confirmed expense estimates by commodity`}>
  <RecurringSummary items={confirmed} {asOf} />
</Section>
{#if error}<p role="alert" class="text-sm text-negative">{error}</p>{/if}
{#if notice}<p role="status" class="text-sm">{notice}</p>{/if}
<Section title="Upcoming" subtitle="Expected occurrences in the next 30 days">
  <ul class="divide-y divide-border-subtle">
    {#each upcoming as { item, date }}
      <li class="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{date.format("D MMM")} · {item.displayName} · {item.kind ?? "Mixed"}</span><span class="tabular-nums">~{item.expectedAmount?.toLocaleString() ?? "Amount unavailable"} {item.commodity ?? ""}</span></li>
    {:else}<li class="text-sm text-muted-foreground">No recurring payments expected in the next 30 days.</li>{/each}
  </ul>
</Section>
<Section title="Needs attention">
  <div class="divide-y divide-border-subtle">
    {#each attention as item (item.key)}<RecurringIntelligenceRow {item} />
    {:else}<p class="text-sm text-muted-foreground">No unusual recurring-payment changes detected.</p>{/each}
  </div>
</Section>
<Section title="Confirmed recurring transactions">
  <div class="divide-y divide-border-subtle">
    {#each confirmed as item (item.key)}<RecurringIntelligenceRow {item} />
    {:else}<p class="text-sm text-muted-foreground">No confirmed recurring transactions yet.</p>{/each}
  </div>
</Section>
<Section title={`Suggested recurring (${candidates.length})`}
  subtitle="Confirmation adds recurring metadata to the listed historical transactions. Rejection hides a suggestion for this page visit.">
  {#if USER_CONFIG.readonly}<p class="text-sm text-muted-foreground">Ledger is read-only. Confirmation is unavailable.</p>{/if}
  <div class="divide-y divide-border-subtle">
    {#if loading}<p role="status">Looking for recurring patterns…</p>
    {:else}
      {#each candidates as item (item.key)}
        <RecurringIntelligenceRow {item} {busy} readonly={USER_CONFIG.readonly} onconfirm={() => confirm(item)} onreject={() => { rejected = [...rejected, item.key]; }} />
      {:else}<p class="text-sm text-muted-foreground">{history.length < 3 ? "Not enough history to detect recurring transactions yet." : "No new recurring patterns found."}</p>{/each}
    {/if}
  </div>
</Section>
