<script lang="ts">
  import { renderBreakdowns } from "$lib/charts/schedule_al";
  import _ from "lodash";
  import { ajax, type ScheduleAL } from "$lib/core/utils";
  import { onMount } from "svelte";
  import { dateMin, year } from "../../../../../store";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let scheduleAls: Record<string, ScheduleAL> = $state();
  let selectedScheduleAl: ScheduleAL = $derived(scheduleAls ? scheduleAls[$year] : null);

  $effect(() => {
    if (selectedScheduleAl) {
      renderBreakdowns(selectedScheduleAl.entries);
    }
  });

  onMount(async () => {
    ({ schedule_als: scheduleAls } = await ajax("/api/schedule_al"));

    let firstScheduleAl = _.minBy(Object.values(scheduleAls), (e) => e.date);
    if (firstScheduleAl) {
      dateMin.set(firstScheduleAl.date);
    }
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Schedule AL"
    description="Statement of Assets and Liabilities for Income Tax filing"
  />

  <Section>
    {#if selectedScheduleAl}
      <p class="subtitle is-6 mb-3">
        Schedule AL as on <span class="has-text-weight-bold"
          >{selectedScheduleAl.date.format("DD MMM YYYY")}</span
        >
      </p>
    {/if}

    <div class="box px-3 p-0">
      <table class="table is-narrow is-fullwidth is-hoverable mb-0">
        <thead>
          <tr>
            <th>Code</th>
            <th>Section</th>
            <th>Details</th>
            <th class="has-text-right">Amount</th>
          </tr>
        </thead>
        <tbody class="d3-schedule-al has-text-grey-dark"></tbody>
      </table>
    </div>
  </Section>
</Page>
