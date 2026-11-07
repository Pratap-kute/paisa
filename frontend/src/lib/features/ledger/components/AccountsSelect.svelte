<script lang="ts">
  import { iconify } from "#lib/shared/ui/icon";
  import Select from "svelte-select";

  interface Props {
    allAccounts: string[];
    accounts: string[];
  }

  let { allAccounts = [], accounts = $bindable([]) }: Props = $props();

  let filterText = $state("");
  let customAccountItems: {
    value: string;
    label: string;
    created?: boolean;
  }[] = $state([]);

  let baseAccountItems = $derived(
    allAccounts.map((account) => ({
      value: account,
      label: account,
    })),
  );

  let allAccountItems = $derived([...baseAccountItems, ...customAccountItems]);

  let accountItems = $derived(
    accounts.map((account) => ({
      value: account,
      label: account,
    })),
  );

  function handleFilter(filteredItems: any[]) {
    if (accountItems?.find((i) => i.label === filterText)) return;
    if (filteredItems.length === 0 && filterText.length > 0) {
      if (!customAccountItems.some((i) => i.value === filterText)) {
        customAccountItems = [
          ...customAccountItems,
          { value: filterText, label: filterText, created: true },
        ];
      }
    }
  }

  function handleChange(selected: any[] | null | undefined) {
    const items: any[] = structuredClone(selected) || [];
    accounts = items.map((i) => i.value);
  }

  function handleClear(removed: any) {
    accounts = accountItems
      .filter((item) => item.value !== removed?.value)
      .map((i) => i.value);
  }
</script>

<Select
  --list-z-index="5"
  multiple
  class="paisa-select-expandable custom-icon"
  items={allAccountItems}
  value={accountItems}
  showChevron={true}
  searchable={true}
  clearable={false}
  onchange={handleChange}
  onclear={handleClear}
  onfilter={handleFilter}
  bind:filterText
>
  {#snippet selection({ selection })}
    <span>{iconify(selection.label)}</span>
  {/snippet}
  {#snippet item({ item })}
    {item.created ? "Add: " : ""}
    {iconify(item.label as string)}
  {/snippet}
</Select>

<style>
  :global(.paisa-select-expandable) {
    --max-height: 200px;
  }
</style>
