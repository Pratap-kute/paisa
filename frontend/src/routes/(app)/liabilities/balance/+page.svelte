<script lang="ts">
  import LiabilitiesBalance from "$lib/features/liabilities/components/LiabilitiesBalance.svelte";
  import { ajax, type LiabilityBreakdown } from "$lib/core/utils";
  import { onMount } from "svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";

  let breakdowns: LiabilityBreakdown[] = $state([]);
  let isLoading = $state(true);

  let hasBreakdowns = $derived(breakdowns.length > 0);

  onMount(async () => {
    try {
      ({ liability_breakdowns: breakdowns } = await ajax("/api/liabilities/balance"));
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Liabilities Balance - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Liabilities Balance"
    description="Outstanding debts, loans, and credit lines"
  />

  <Section
    title="Account Balances"
    subtitle="Drawn amounts, repayments, and interest by liability account"
  >
    {#if isLoading}
      <div
        class="flex flex-col gap-[var(--paisa-space-2)] rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] p-[var(--paisa-space-4)]"
        aria-hidden="true"
      >
        {#each Array(6) as _}
          <div class="h-5 animate-pulse rounded-[var(--paisa-radius-sm)] bg-[var(--paisa-surface-hover)]"></div>
        {/each}
      </div>
    {:else if !hasBreakdowns}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          <strong class="text-[var(--paisa-foreground)]">Hurray!</strong> You have no liabilities.
        </p>
      </ZeroState>
    {:else}
      <div class="max-w-full overflow-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]">
        <LiabilitiesBalance {breakdowns} />
      </div>
    {/if}
  </Section>
</Page>
