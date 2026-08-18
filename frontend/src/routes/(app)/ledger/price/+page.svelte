<script lang="ts">
  import Toggleable from "$lib/components/ui/Toggleable.svelte";
  import ValueChange from "$lib/components/ui/ValueChange.svelte";
  import { ajax, formatCurrency, type Price } from "$lib/core/utils";
  import { toast } from "$lib/core/toast";
  import _ from "lodash";
  import { onMount } from "svelte";
  import VirtualList from "svelte-tiny-virtual-list";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let prices: Record<string, Price[]> = $state({});

  const ITEM_SIZE = 18;

  function change(prices: Price[], days: number, tolerance: number) {
    const first = prices[0];
    if (!first) return null;

    const date = first.date.subtract(days, "day");
    const last = _.find(prices, (p) => p.date.isSameOrBefore(date, "day"));
    if (!last) return null;

    const diffDays = first.date.diff(last.date, "day");
    if (Math.abs(diffDays - days) <= tolerance) {
      return (first.value - last.value) / last.value;
    }
    return null;
  }

  async function clearPriceCache() {
    const { success, message } = await ajax("/api/price/delete", { method: "POST" });
    if (!success) {
      toast({
        message: `Failed to clear price cache. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
    } else {
      toast({
        message: "Price cache cleared.",
        type: "is-success"
      });
    }
    await fetchPrice();
  }

  async function fetchPrice() {
    ({ prices: prices } = await ajax("/api/price"));
    prices = _.omitBy(prices, (v) => v.length === 0);
  }

  onMount(async () => {
    await fetchPrice();
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Commodity Prices"
    description="Latest prices, historical changes, and market trends"
  />

  <Section>
    <div class="box p-3 mb-3">
      <div class="field has-addons mb-0">
        <p class="control">
          <button
            class="button is-small is-link invertable is-light is-danger"
            onclick={(_e) => clearPriceCache()}
          >
            <span class="icon is-small">
              <i class="fas fa-trash-can"></i>
            </span>
            <span>Clear Price Cache</span>
          </button>
        </p>
      </div>
    </div>

    <div class="box paisa-overflow-x-auto p-0">
      <table class="table is-narrow is-fullwidth is-light-border is-hoverable mb-0">
        <thead>
          <tr>
            <th></th>
            <th>Commodity Name</th>
            <th>Last Date</th>
            <th class="has-text-right">Last Price</th>
            <th class="has-text-right">1 Day</th>
            <th class="has-text-right">1 Week</th>
            <th class="has-text-right">4 Weeks</th>
            <th class="has-text-right">1 Year</th>
            <th class="has-text-right">3 Years</th>
            <th class="has-text-right">5 Years</th>
            <th>Commodity Type</th>
            <th>Commodity ID</th>
          </tr>
        </thead>
        <tbody class="has-text-grey-dark">
          {#each Object.keys(prices) as commodity}
            {@const p = prices[commodity]?.[0]}
            {#if p}
              <Toggleable>
                {#snippet toggle({ active, onclick })}
                  <tr
                    class={active ? "is-active" : ""}
                    style="cursor: pointer;"
                    onclick={(e) => onclick(e)}
                  >
                    <td>
                      <span class="icon has-text-link">
                        <i
                          class="fas {active ? 'fa-chevron-up' : 'fa-chevron-down'}"
                          aria-hidden="true"
                        ></i>
                      </span>
                    </td>

                    <td>{p.commodity_name}</td>
                    <td class="paisa-nowrap">{p.date.format("DD MMM YYYY")}</td>
                    <td class="has-text-right">{formatCurrency(p.value, 4)}</td>
                    <td class="has-text-right"
                      ><ValueChange value={change(prices[commodity], 1, 0)} /></td
                    >
                    <td class="has-text-right"
                      ><ValueChange value={change(prices[commodity], 7, 2)} /></td
                    >
                    <td class="has-text-right"
                      ><ValueChange value={change(prices[commodity], 28, 4)} />
                    </td>
                    <td class="has-text-right"
                      ><ValueChange value={change(prices[commodity], 365, 7)} />
                    </td>
                    <td class="has-text-right"
                      ><ValueChange value={change(prices[commodity], 365 * 3, 7)} /></td
                    >
                    <td class="has-text-right"
                      ><ValueChange value={change(prices[commodity], 365 * 5, 7)} /></td
                    >
                    <td>{p.commodity_type}</td>
                    <td>{p.commodity_id}</td>
                  </tr>
                {/snippet}
                {#snippet content()}
                  <tr>
                    <td colspan="10"></td>
                    <td colspan="2" class="p-0">
                      <div>
                        <VirtualList
                          width="100%"
                          height={_.min([ITEM_SIZE * prices[commodity].length, ITEM_SIZE * 20])}
                          itemCount={prices[commodity].length}
                          itemSize={ITEM_SIZE}
                        >
                          <svelte:fragment slot="item" let:index let:style>
                            {@const p = prices[commodity]?.[index]}
                            <div
                              {style}
                              class="small-box is-flex is-flex-wrap-wrap is-justify-content-space-between is-size-7"
                            >
                              {#if p}
                                <div class="pl-1">{p.date.format("DD MMM YYYY")}</div>
                                <div class="pr-1 has-text-right">
                                  {formatCurrency(p.value, 4)}
                                </div>
                              {/if}
                            </div>
                          </svelte:fragment>
                        </VirtualList>
                      </div>
                    </td>
                  </tr>
                {/snippet}
              </Toggleable>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </Section>
</Page>
