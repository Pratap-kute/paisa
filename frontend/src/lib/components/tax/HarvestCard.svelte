<script lang="ts">
  import dayjs from "dayjs";
  import { round } from "lodash";
  import {
    harvestablePercentage,
    unitsRequiredFromAmount,
    unitsRequiredFromGain,
  } from "$lib/charts/harvest_data";
  import {
    formatCurrency,
    formatFloat,
    type Harvestable,
    restName,
  } from "$lib/core/utils";

  let { harvestable }: { harvestable: Harvestable } = $props();
  let units = $state(0);
  let amount = $state(0);
  let taxableGain = $state(0);
  let initialized = false;
  const percentage = $derived(harvestablePercentage(harvestable));
  const barPercentage = $derived(Math.max(0, Math.min(100, percentage)));

  $effect(() => {
    if (initialized) return;
    const initial = unitsRequiredFromGain(harvestable, 100000);
    units = initial[0];
    amount = round(initial[1]);
    taxableGain = round(initial[2]);
    initialized = true;
  });

  function updateFromAmount(value: number) {
    const result = unitsRequiredFromAmount(harvestable, value || 0);
    units = result[0];
    amount = round(result[1]);
    taxableGain = round(result[2]);
  }

  function updateFromGain(value: number) {
    const result = unitsRequiredFromGain(harvestable, value || 0);
    units = result[0];
    amount = round(result[1]);
    taxableGain = round(result[2]);
  }
</script>

<article class="harvest-card" data-testid="harvest-card">
  <header class="harvest-header">
    <h2>{restName(harvestable.account)}</h2>
    <div class="harvest-calculator">
      <span>If you redeem <strong>{formatFloat(units)}</strong> units you will get</span>
      <label>
        <span class="sr-only">Redemption amount</span>
        <span aria-hidden="true">₹</span><input type="number" step="1000" value={amount} oninput={(event) => updateFromAmount(event.currentTarget.valueAsNumber)} />
      </label>
      <span>and your <strong>taxable</strong> gain would be</span>
      <label>
        <span class="sr-only">Taxable gain</span>
        <span aria-hidden="true">₹</span><input type="number" step="1000" value={taxableGain} oninput={(event) => updateFromGain(event.currentTarget.valueAsNumber)} />
      </label>
    </div>
    <p>Price as on {dayjs(harvestable.current_unit_date).format("DD MMM YYYY")}</p>
  </header>

  <div class="harvest-body">
    <div class="harvest-summary">
      <div class="units-indicator" aria-label={`${formatFloat(harvestable.harvestable_units)} of ${formatFloat(harvestable.total_units)} units are harvestable`}>
        <div class="units-bar" role="img">
          <span class="units-harvestable" style:width={`${barPercentage}%`}></span>
          <span class="units-remaining"></span>
        </div>
        <div class="units-labels">
          <span>Harvestable {formatFloat(percentage)}%</span>
          <span>Remaining {formatFloat(100 - percentage)}%</span>
        </div>
      </div>

      <table class="summary-table">
        <tbody>
          <tr><th scope="row">Balance Units</th><td>{formatFloat(harvestable.total_units)}</td></tr>
          <tr><th scope="row">Harvestable Units</th><td class="positive">{formatFloat(harvestable.harvestable_units)}</td></tr>
          <tr><th scope="row">Tax Category</th><td class="uppercase">{harvestable.tax_category}</td></tr>
          <tr><th scope="row">Current Unit Price</th><td>{formatFloat(harvestable.current_unit_price)}</td></tr>
          <tr><th scope="row">Unrealized Gain / Loss</th><td>{formatCurrency(harvestable.unrealized_gain)}</td></tr>
          <tr><th scope="row">Taxable Unrealized Gain / Loss</th><td>{formatCurrency(harvestable.taxable_unrealized_gain)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="detail-table-wrap">
      <table class="detail-table">
        <thead><tr><th>Purchase Date</th><th>Units</th><th>Purchase Price</th><th>Purchase Unit Price</th><th>Current Price</th><th>Gain</th><th>Taxable Gain</th><th>Short Term Tax</th><th>Long Term Tax</th><th>Taxable at Slab Rate</th></tr></thead>
        <tbody>
          {#each harvestable.harvest_breakdown as breakdown, index (`${breakdown.purchase_date}-${index}`)}
            <tr>
              <td>{dayjs(breakdown.purchase_date).format("DD MMM YYYY")}</td>
              <td>{formatFloat(breakdown.units)}</td>
              <td>{formatCurrency(breakdown.purchase_price)}</td>
              <td>{formatFloat(breakdown.purchase_unit_price)}</td>
              <td>{formatCurrency(breakdown.current_price)}</td>
              <td>{formatCurrency(breakdown.tax.gain)}</td>
              <td>{formatCurrency(breakdown.tax.taxable)}</td>
              <td>{formatCurrency(breakdown.tax.short_term)}</td>
              <td>{formatCurrency(breakdown.tax.long_term)}</td>
              <td>{formatCurrency(breakdown.tax.slab)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</article>

<style>
  .harvest-card { overflow: hidden; border: 1px solid var(--paisa-border-subtle); border-radius: var(--paisa-radius-md); background: var(--paisa-surface-card); color: var(--paisa-foreground); }
  .harvest-header { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; padding: .75rem; border-bottom: 1px solid var(--paisa-border-subtle); }
  .harvest-header h2 { margin: 0; font-size: var(--paisa-font-size-sm); font-weight: var(--paisa-font-weight-semibold); }
  .harvest-header p { margin: 0 0 0 auto; font-size: var(--paisa-font-size-xs); color: var(--paisa-muted-foreground); }
  .harvest-calculator { display: flex; flex: 1 1 32rem; align-items: center; flex-wrap: wrap; gap: .25rem; font-size: var(--paisa-font-size-xs); color: var(--paisa-muted-foreground); }
  input { width: 6.5rem; padding: .25rem .4rem; font: inherit; font-family: var(--paisa-font-mono); border: 1px solid var(--paisa-border); border-radius: var(--paisa-radius-sm); background: var(--paisa-surface); color: var(--paisa-foreground); }
  .harvest-body { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr); gap: var(--paisa-space-3); padding: .75rem; }
  .units-bar { display: flex; width: 100%; height: 1.25rem; overflow: hidden; border-radius: var(--paisa-radius-sm); background: var(--paisa-surface-raised); }
  .units-harvestable { background: var(--paisa-positive); }
  .units-remaining { flex: 1; background: var(--paisa-chart-series-3); }
  .units-labels { display: flex; justify-content: space-between; gap: .5rem; margin-top: .35rem; font-size: var(--paisa-font-size-xs); color: var(--paisa-muted-foreground); }
  table { width: 100%; border-collapse: collapse; font-size: var(--paisa-font-size-xs); }
  .summary-table { margin-top: .75rem; }
  th, td { padding: .3rem .5rem; border-bottom: 1px solid var(--paisa-border-subtle); text-align: left; }
  .summary-table th { font-weight: 400; }
  .summary-table th { color: var(--paisa-muted-foreground); }
  .summary-table td { color: var(--paisa-foreground); }
  .summary-table td, .detail-table th:not(:first-child), .detail-table td:not(:first-child) { text-align: right; }
  .summary-table td, .detail-table td:nth-child(n+6) { font-weight: var(--paisa-font-weight-semibold); }
  .positive { color: var(--paisa-positive); }
  .detail-table-wrap { max-height: 245px; overflow: auto; }
  .detail-table { min-width: 980px; }
  .detail-table thead { position: sticky; top: 0; background: var(--paisa-surface-raised); }
  .detail-table tbody tr:hover { background: var(--paisa-surface-hover); }
  @media (max-width: 768px) { .harvest-body { grid-template-columns: 1fr; } .harvest-header p { margin-left: 0; } }
</style>
