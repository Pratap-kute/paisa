<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";
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

  function handleSave(e: Event) {
    if (onsave) {
      onsave(destinationFile);
    }
    dispatch("save", destinationFile);
  }
</script>

<Modal bind:active={open}>
  {#snippet head({ close })}
  
      <p class="modal-card-title">{label}</p>
      <button class="delete" aria-label="close" onclick={(e) => close(e)}></button>
    
  {/snippet}
  {#snippet body()}
    <div class="field" >
      <label class="label" for="save-filename">File Name</label>
      <div class="control" id="save-filename">
        <input class="input" type="text" {placeholder} bind:value={destinationFile} />
        <p class="help">{help}</p>
      </div>
    </div>
  {/snippet}
  {#snippet foot({ close })}
  
      <button
        class="button is-success"
        disabled={_.isEmpty(destinationFile)}
        onclick={(e) => { handleSave(e); close(e); }}>{label}</button
      >
      <button class="button" onclick={(e) => close(e)}>Cancel</button>
    
  {/snippet}
</Modal>
