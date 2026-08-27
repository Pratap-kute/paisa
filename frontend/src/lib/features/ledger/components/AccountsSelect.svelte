<script lang="ts">
import { iconify } from "$lib/shared/ui/icon";
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

function handleFilter(e: any) {
  if (accountItems?.find((i) => i.label === filterText)) return;
  if (e.detail.length === 0 && filterText.length > 0) {
    if (!customAccountItems.some((i) => i.value === filterText)) {
      customAccountItems = [
        ...customAccountItems,
        { value: filterText, label: filterText, created: true },
      ];
    }
  }
}

function handleChange(e: any) {
  let items: any[];
  if (e.type === "clear") {
    items = accountItems.filter((item) => item.value !== e.detail?.value);
  } else {
    items = structuredClone(e.detail) || [];
  }

  accounts = items.map((i) => i.value);
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
  on:change={handleChange}
  on:clear={handleChange}
  on:filter={handleFilter}
  bind:filterText
>
  <div slot="selection" let:selection>
    <span>{iconify(selection.label)}</span>
  </div>
  <div slot="item" let:item>
    {item.created ? "Add: " : ""}
    {iconify(item.label)}
  </div>
</Select>

<style>
:global(.paisa-select-expandable) {
  --max-height: 200px;
}
</style>
