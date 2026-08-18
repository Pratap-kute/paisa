<script lang="ts">
  import { accountColorStyle } from "$lib/core/colors";
  import { iconText } from "$lib/core/icon";
  import { firstName, formatCurrency, formatFloatUptoPrecision, type Posting } from "$lib/core/utils";

  const unlessDefaultCurrency = (p: Posting) => {
    if (p.commodity == USER_CONFIG.default_currency) {
      return "";
    } else {
      return `${formatFloatUptoPrecision(p.quantity, 3)} ${
        p.commodity
      } @ ${formatFloatUptoPrecision(p.amount / p.quantity, 4)}`;
    }
  };

  interface Props {
    postings: Posting[];
  }

  let { postings }: Props = $props();
</script>

<div class="paisa-postings-grid">
  {#each postings as p}
    <div class="paisa-postings-row is-hoverable">
      <div class="paisa-truncate custom-icon" title={p.account}>
        <span style={accountColorStyle(firstName(p.account))}>{iconText(p.account)}</span>
        {p.account}
      </div>
      <div class="has-text-right has-text-grey is-size-7 paisa-truncate">
        {unlessDefaultCurrency(p)}
      </div>
      <div class="has-text-right">
        {formatCurrency(p.amount, 2)}
      </div>
    </div>
  {/each}
</div>
