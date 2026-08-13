<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let accept = "";
  export let multiple = false;
  let input: HTMLInputElement;
  let dragging = false;
  const dispatch = createEventDispatcher<{ drop: { acceptedFiles: File[]; rejectedFiles: File[] } }>();

  function accepted(file: File) {
    const rules = accept.split(",").map((rule) => rule.trim().toLowerCase()).filter(Boolean);
    return rules.length === 0 || rules.some((rule) =>
      rule.startsWith(".") ? file.name.toLowerCase().endsWith(rule) : file.type === rule
    );
  }

  function select(files: FileList | null) {
    const selected = [...(files || [])];
    const acceptedFiles = selected.filter(accepted).slice(0, multiple ? undefined : 1);
    dispatch("drop", { acceptedFiles, rejectedFiles: selected.filter((file) => !accepted(file)) });
    if (input) input.value = "";
  }
</script>

<button
  type="button"
  class="dropzone paisa-file-dropzone"
  class:is-dragging={dragging}
  on:click={() => input.click()}
  on:dragenter|preventDefault={() => (dragging = true)}
  on:dragover|preventDefault={() => (dragging = true)}
  on:dragleave|preventDefault={() => (dragging = false)}
  on:drop|preventDefault={(event) => {
    dragging = false;
    select(event.dataTransfer?.files || null);
  }}
>
  <slot />
</button>
<input bind:this={input} class="is-hidden" type="file" {accept} {multiple} on:change={(event) => select(event.currentTarget.files)} />
