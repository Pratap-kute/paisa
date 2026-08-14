<script lang="ts">
  import { dueDateIcon } from "$lib/core/utils";
  import dayjs from "dayjs";

  export let dueDate: dayjs.Dayjs;
  export let paidDate: dayjs.Dayjs;
  export let amountDue: number = undefined;

  $: icon = dueDateIcon(dueDate, paidDate, amountDue);
</script>

<span title="due on {dueDate.format('DD MMM YYYY')}">
  <span class="icon is-small {icon.color}">
    <i class="fas {icon.icon}"></i>
  </span>
  {#if amountDue !== undefined && amountDue <= 0}
    <span>no dues</span>
  {:else if paidDate}
    <span>paid on {paidDate.format("DD MMM YYYY")}</span>
  {:else}
    <span>due {dueDate.fromNow()}</span>
  {/if}
</span>
