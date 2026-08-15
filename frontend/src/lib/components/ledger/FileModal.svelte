<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import _ from "lodash";
  import { createEventDispatcher } from "svelte";

  interface Props {
    label?: string;
    help?: string;
    placeholder?: string;
    open?: boolean;
    onsave?: (filename: string) => void;
  }

  let {
    label = "Save As",
    help = "Create or overwrite existing file",
    placeholder = "expense.ledger",
    open = $bindable(false),
    onsave
  }: Props = $props();
  let destinationFile = $state("");

  const dispatch = createEventDispatcher();

  function handleSave(e?: Event) {
    if (onsave) {
      onsave(destinationFile);
    }
    dispatch("save", destinationFile);
    destinationFile = "";
  }
</script>

<Modal bind:active={open} title={label} width="min(460px, 95vw)">
  {#snippet body()}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        if (!_.isEmpty(destinationFile)) {
          handleSave(e);
          open = false;
        }
      }}
    >
      <div class="field mb-0">
        <label class="label paisa-form-label" for="save-filename">File Name</label>
        <Input
          id="save-filename"
          size="md"
          {placeholder}
          bind:value={destinationFile}
          class="paisa-font-mono"
          onkeydown={(e) => {
            if (e.key === "Enter" && !_.isEmpty(destinationFile)) {
              e.preventDefault();
              handleSave(e);
              open = false;
            }
          }}
        >
          {#snippet prefixIcon()}
            <i class="fa-regular fa-file-lines"></i>
          {/snippet}
        </Input>
        {#if help}
          <p class="help paisa-form-help mt-2 mb-0">{help}</p>
        {/if}
      </div>
    </form>
  {/snippet}
  {#snippet foot({ close })}
    <div class="paisa-modal-button-group">
      <Button
        variant="primary"
        size="md"
        disabled={_.isEmpty(destinationFile)}
        onclick={(e) => {
          handleSave(e);
          close(e);
        }}
      >
        {label}
      </Button>
      <Button
        variant="ghost"
        size="md"
        onclick={(e) => close(e)}
      >
        Cancel
      </Button>
    </div>
  {/snippet}
</Modal>

<style lang="scss">
  .paisa-form-label {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-medium);
    color: var(--paisa-text-primary);
    margin-bottom: var(--paisa-space-2);
  }

  .paisa-form-help {
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-muted);
  }

  .paisa-modal-button-group {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    width: 100%;
  }
</style>

