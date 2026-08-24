<script lang="ts">
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import FormField from "$lib/components/layout/FormField.svelte";
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

<Dialog bind:open title={label} width="min(460px, 95vw)">
  {#snippet children({ close })}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        if (destinationFile.trim()) {
          handleSave(e);
          close();
        }
      }}
    >
      <FormField id="save-filename" label="File Name" description={help}>
        {#snippet children()}
          <Input
            id="save-filename"
            size="md"
            {placeholder}
            bind:value={destinationFile}
            class="paisa-font-mono"
            onkeydown={(e) => {
              if (e.key === "Enter" && destinationFile.trim()) {
                e.preventDefault();
                handleSave(e);
                close();
              }
            }}
          >
            {#snippet prefixIcon()}
              <i class="fa-regular fa-file-lines"></i>
            {/snippet}
          </Input>
        {/snippet}
      </FormField>
    </form>
  {/snippet}
  {#snippet footer({ close })}
    <div class="paisa-modal-button-group">
      <Button
        variant="primary"
        size="md"
        disabled={!destinationFile.trim()}
        onclick={(e) => {
          handleSave(e);
          close();
        }}
      >
        {label}
      </Button>
      <Button variant="ghost" size="md" onclick={() => close()}>Cancel</Button>
    </div>
  {/snippet}
</Dialog>

<style>
  .paisa-modal-button-group {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    width: 100%;
  }
</style>
