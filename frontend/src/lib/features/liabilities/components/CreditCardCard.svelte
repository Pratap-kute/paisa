<script lang="ts">
import Card from "$lib/shared/ui/Card.svelte";
import { formatPercentage } from "$lib/shared/formatters/currency";
import { restName } from "$lib/domain/account";
import { now } from "$lib/domain/time";
import type { CreditCardSummary } from "$lib/domain/liabilities";
import type { CreditCardBill } from "$lib/domain/liabilities";
import { iconText } from "$lib/shared/ui/icon";
import { formatCurrency } from "$lib/shared/formatters/currency";
import CreditCardNetwork from "./CreditCardNetwork.svelte";
import DueDate from "./DueDate.svelte";

interface Props {
  creditCard: CreditCardSummary;
}

let { creditCard }: Props = $props();

function lastBill(creditCard: CreditCardSummary): CreditCardBill | undefined {
  return creditCard.bills.findLast((b) =>
    b.statementEndDate.isSameOrBefore(now())
  );
}

let bill = $derived(lastBill(creditCard));
</script>

<Card
  padding="sm"
  variant="flat"
  class="credit-card flex flex-col justify-between m-0"
>
  <div class="flex items-center justify-between font-bold text-xl">
    <div class="credit-card-chip flex items-center opacity-20">
      <svg
        class="chip"
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="M10 4h10c1.11 0 2 .89 2 2v2h-3.41L16 10.59v4l-2 2V20h-4v-3.41l-2-2V9.41l2-2zm8 7.41V14h4v-4h-2.59zM6.59 8L8 6.59V4H4c-1.11 0-2 .89-2 2v2zM6 14v-4H2v4zm2 3.41L6.59 16H2v2c0 1.11.89 2 2 2h4zM17.41 16L16 17.41V20h4c1.11 0 2-.89 2-2v-2z"
        />
      </svg>
      <svg
        class="nfc ml-1"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 8.32a7.43 7.43 0 0 1 0 7.36m3.46-9.47a11.76 11.76 0 0 1 0 11.58M12.91 4.1a15.91 15.91 0 0 1 .01 15.8M16.37 2a20.16 20.16 0 0 1 0 20"
        />
      </svg>
    </div>
    <div>
      <a
        class="secondary-link text-muted-foreground"
        href="/liabilities/credit_cards/{encodeURIComponent(
          creditCard.account,
        )}"
      >
        <span class="custom-icon">{iconText(creditCard.account)}</span>
        <span>{restName(restName(creditCard.account))}</span>
      </a>
    </div>
  </div>
  <div class="flex justify-between">
    <div class="flex flex-col">
      {#if bill}
        <div class="text-xs">
          <span class="text-muted-foreground">Amount Due</span>
        </div>
        <div>
          <span class="text-2xl text-foreground"
            >{formatCurrency(bill.closingBalance)}</span
          >
        </div>
        <div class="text-xs text-muted-foreground">
          <DueDate
            dueDate={bill.dueDate}
            paidDate={bill.paidDate}
            amountDue={bill.closingBalance}
          />
        </div>
      {/if}
    </div>
    <div class="flex flex-col">
      <div class="text-xs">
        <span class="text-muted-foreground">Balance</span>
      </div>
      <div class="flex flex-col">
        <span class="text-2xl text-foreground"
        >{formatCurrency(creditCard.balance)}</span>
        <span class="text-xs text-muted-foreground"
        >{formatPercentage(creditCard.balance / creditCard.creditLimit)} of {formatCurrency(
            creditCard.creditLimit,
          )}
        </span>
      </div>
    </div>
  </div>
  <div class="flex justify-between items-end">
    <div class="font-bold text-xl inline-flex items-center">
      <span class="opacity-40 inline-flex flex-col mr-2 credit-card-valid-thru">
        <span>VALID</span>
        <span>THRU</span>
      </span>
      <span class="opacity-30"
      >{creditCard.expirationDate.format("MM / YY")} &nbsp; &nbsp; &nbsp; * * *
        * &nbsp; {creditCard.number}</span>
    </div>
    <div class="opacity-15">
      <CreditCardNetwork size={48} name={creditCard.network} />
    </div>
  </div>
</Card>

<style>
:global(.paisa-card.credit-card) {
  aspect-ratio: 3.375 / 2.125;
  max-width: 25rem;
  min-width: 19rem;
  width: 100%;
  flex: 1;
  border-radius: var(--paisa-radius-lg, 0.7rem);
  border: 1px solid var(--paisa-border-subtle);
  box-shadow: var(--paisa-shadow-md);
  background: linear-gradient(
    345deg,
    var(--paisa-surface) 0%,
    var(--paisa-surface) 60%,
    var(--paisa-surface-hover) calc(60% + 1px),
    var(--paisa-surface-hover) 85%,
    var(--paisa-surface-hover) calc(85% + 1px),
    var(--paisa-surface-hover) 95%,
    var(--paisa-border-strong) calc(95% + 1px),
    var(--paisa-border-strong) 100%
  );
}

.credit-card-chip {
  margin: 2.25rem 0 0 1rem;
}

.credit-card-valid-thru {
  font-size: 0.5rem;
  line-height: 1;
}

.chip {
  color: var(--paisa-warning);
}

.nfc {
  color: var(--paisa-foreground);
}
</style>
