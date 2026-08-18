<script lang="ts">
  import { formatCurrency, type FYCapitalGain } from "$lib/core/utils";
  const DATE_FORMAT = "DD MMM YYYY";

  interface Props {
    fyCapitalGain: FYCapitalGain;
  }

  let { fyCapitalGain }: Props = $props();
</script>

<div>
  <table class="table is-narrow is-fullwidth is-bordered">
    <thead>
      <tr>
        <th>Purchase Date</th>
        <th class="has-text-right">Purchase Price</th>
        <th>Sell Date</th>
        <th class="has-text-right">Sell Price</th>
        <th class="has-text-right">Gain</th>
        <th class="has-text-right">Taxable Gain</th>
        <th class="has-text-right">Short Term Tax</th>
        <th class="has-text-right">Long Term Tax</th>
        <th class="has-text-right">Taxable at Slab Rate</th>
      </tr>
    </thead>
    <tbody>
      {#each fyCapitalGain.posting_pairs as pp}
        <tr class="is-size-7">
          <td>{pp.purchase.date.format(DATE_FORMAT)}</td>
          <td class="has-text-right">{formatCurrency(pp.purchase.amount)}</td>
          <td>{pp.sell.date.format(DATE_FORMAT)}</td>
          <td class="has-text-right">{formatCurrency(-pp.sell.amount)}</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(pp.tax.gain)}</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(pp.tax.taxable)}</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(pp.tax.short_term)}</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(pp.tax.long_term)}</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(pp.tax.slab)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
