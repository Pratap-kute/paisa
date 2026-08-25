<script lang="ts">
  import type { Posting } from "$lib/domain/ledger";

  interface Props {
    posting: Posting;
  }

  let { posting }: Props = $props();
</script>

{#if posting.status == "cleared"}
  <span class="paisa-status-icon is-cleared" title="Cleared">
    <i class="fa-solid fa-check"></i>
  </span>
{:else if posting.status == "pending"}
  <span class="paisa-status-icon is-pending" title="Pending">
    <i class="fa-solid fa-exclamation"></i>
  </span>
{/if}

<style>
  .paisa-status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 10px;
    margin-right: 4px;
    vertical-align: middle;

    &.is-cleared {
      color: var(--paisa-positive);
    }

    &.is-pending {
      color: var(--paisa-warning);
    }
  }
</style>
