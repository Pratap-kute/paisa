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

<div class="paisa-bulk-edit-card">
  <div class="paisa-bulk-edit-header">
    <div class="paisa-bulk-edit-title">
      <i class="fa-solid fa-pen-to-square text-[var(--paisa-primary)] mr-2"></i>
      <span>Bulk Operations</span>
    </div>
    <div class="paisa-bulk-edit-hint">
      Batch update accounts across the current filtered transactions
    </div>
  </div>

  <div class="paisa-bulk-edit-controls flex flex-wrap items-end gap-3">
    <!-- Operation Pill -->
    <div class="paisa-control-item">
      <span class="paisa-control-label">Operation</span>
      <div class="paisa-op-badge">
        <i class="fa-solid fa-arrows-rotate text-[var(--paisa-primary)] mr-1.5 text-xs"></i>
        <span>Rename Account</span>
      </div>
    </div>

    {#if selectedOperation === "rename_account"}
      <!-- Old Account -->
      <div class="paisa-control-item is-expanded">
        <label class="paisa-control-label" for="old-account-select">Old Account Name</label>
        <div class="paisa-svelte-select-wrap">
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
              args.oldAccountName = selectedItem?.name || "";
            }}
          ></Select>
        </div>
      </div>

      <!-- New Account -->
      <div class="paisa-control-item is-expanded">
        <label class="paisa-control-label" for="new-account-input">New Account Name</label>
        <input
          id="new-account-input"
          bind:value={args.newAccountName}
          class="paisa-text-input"
          type="text"
          placeholder="New Account name"
        />
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="paisa-bulk-edit-actions">
      <button
        type="button"
        class="paisa-preview-btn"
        onclick={(_e) => dispatch("preview", { operation: selectedOperation, args: args })}
      >
        <i class="fa-solid fa-eye mr-1.5 text-xs"></i>
        <span>Preview</span>
      </button>
    </div>
  </div>
</div>

<style>
  .paisa-bulk-edit-card {
    background-color: var(--paisa-surface-raised);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-lg, 0.5rem);
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
    box-shadow: var(--paisa-shadow-sm);
  }

  .paisa-bulk-edit-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.875rem;
    flex-wrap: wrap;
  }

  .paisa-bulk-edit-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--paisa-foreground);
    display: flex;
    align-items: center;
  }

  .paisa-bulk-edit-hint {
    font-size: 0.75rem;
    color: var(--paisa-muted-foreground);
  }

  .paisa-bulk-edit-controls {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .paisa-control-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    &.is-expanded {
      flex: 1 1 200px;
      min-width: 180px;
    }
  }

  .paisa-control-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--paisa-muted-foreground);
  }

  .paisa-op-badge {
    height: 2.25rem;
    padding: 0 0.875rem;
    display: inline-flex;
    align-items: center;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--paisa-foreground);
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-md, 0.375rem);
    white-space: nowrap;
  }

  .paisa-text-input {
    height: 2.25rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    color: var(--paisa-foreground);
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-md, 0.375rem);
    outline: none;
    transition: border-color var(--paisa-transition-fast), box-shadow var(--paisa-transition-fast);
    width: 100%;

    &:focus {
      border-color: var(--paisa-primary);
      box-shadow: 0 0 0 2px var(--paisa-primary-subtle);
    }
  }

  .paisa-svelte-select-wrap {
    :global(.svelte-select) {
      --height: 2.25rem;
      --max-height: 2.25rem;
      --background: var(--paisa-surface);
      --border: 1px solid var(--paisa-border);
      --border-radius: var(--paisa-radius-md, 0.375rem);
      --font-size: 0.8125rem;
      --item-color: var(--paisa-foreground);
      --input-color: var(--paisa-foreground);
      --selected-item-color: var(--paisa-foreground);
      --list-background: var(--paisa-surface);
      --list-border: 1px solid var(--paisa-border);
      --list-shadow: var(--paisa-shadow-lg);
      --item-hover-bg: var(--paisa-surface-hover);
      --item-hover-color: var(--paisa-foreground);
    }
  }

  .paisa-bulk-edit-actions {
    display: flex;
    align-items: center;
  }

  .paisa-preview-btn {
    height: 2.25rem;
    padding: 0 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--paisa-inverse-foreground, #fff);
    background-color: var(--paisa-primary);
    border: none;
    border-radius: var(--paisa-radius-md, 0.375rem);
    cursor: pointer;
    transition: filter var(--paisa-transition-fast);

    &:hover {
      filter: brightness(1.08);
    }

    &:focus-visible {
      outline: 2px solid var(--paisa-primary);
      outline-offset: 2px;
    }
  }
</style>
