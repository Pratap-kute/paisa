<script lang="ts">
  import _ from "lodash";
  import { createEventDispatcher } from "svelte";
  import Select from "svelte-select";

  interface Props {
    accounts: string[];
  }

  let { accounts }: Props = $props();

  let selectItems = $derived(_.map(accounts, (account) => {
    return { id: account, name: account };
  }));

  let selectedItem: { id: string; name: string } = $state();

  const OPERATIONS = [{ id: "rename_account", label: "Rename Account" }];
  let selectedOperation = $state(OPERATIONS[0].id);

  let args = $state({ oldAccountName: "", newAccountName: "" });

  const dispatch = createEventDispatcher();
</script>

<div class="field is-grouped">
  <div class="control">
    <div class="select">
      <select bind:value={selectedOperation}>
        {#each OPERATIONS as operation}
          <option value={operation.id}>{operation.label}</option>
        {/each}
      </select>
    </div>
  </div>
  {#if selectedOperation === "rename_account"}
    <div class="control is-expanded">
      <Select
        bind:value={selectedItem}
        showChevron={true}
        items={selectItems}
        label="name"
        itemId="id"
        placeholder="Old Account name"
        searchable={true}
        clearable={false}
        on:change={(_e) => {
          args.oldAccountName = selectedItem.name;
        }}
      ></Select>
    </div>
    <div class="control is-expanded">
      <input
        bind:value={args.newAccountName}
        class="input"
        type="text"
        placeholder="New Account name"
      />
    </div>
  {/if}
  <p class="control">
    <button
      type="button"
      class="button is-link"
      onclick={(_e) => dispatch("preview", { operation: selectedOperation, args: args })}
      >Preview</button
    >
  </p>
</div>
