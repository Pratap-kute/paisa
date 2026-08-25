<script lang="ts">
import { dueDateIcon } from "$lib/shared/ui/due_date";
import dayjs from "dayjs";

interface Props {
  dueDate: dayjs.Dayjs;
  paidDate: dayjs.Dayjs;
  amountDue?: number;
}

let { dueDate, paidDate, amountDue = undefined }: Props = $props();

let icon = $derived(dueDateIcon(dueDate, paidDate, amountDue));
</script>

<span title="due on {dueDate.format('DD MMM YYYY')}">
  <span class="inline-flex items-center text-xs {icon.color}">
    <i class="fas {icon.icon}" aria-hidden="true"></i>
  </span>
  {#if amountDue !== undefined && amountDue <= 0}
    <span>no dues</span>
  {:else if paidDate}
    <span>paid on {paidDate.format("DD MMM YYYY")}</span>
  {:else}
    <span>due {dueDate.fromNow()}</span>
  {/if}
</span>
