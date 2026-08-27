<script lang="ts">
import { createEventDispatcher } from "svelte";
import type { Snippet } from "svelte";

interface Props {
  accept?: string;
  multiple?: boolean;
  children?: Snippet;
}

let { accept = "", multiple = false, children }: Props = $props();
let input: HTMLInputElement | undefined = $state();
let dragging = $state(false);
const dispatch = createEventDispatcher<
  { drop: { acceptedFiles: File[]; rejectedFiles: File[] } }
>();

function accepted(file: File) {
  const rules = accept.split(",").map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
  return rules.length === 0 ||
    rules.some((rule) =>
      rule.startsWith(".")
        ? file.name.toLowerCase().endsWith(rule)
        : file.type === rule
    );
}

function select(files: FileList | null) {
  const selected = [...(files || [])];
  const acceptedFiles = selected.filter(accepted).slice(
    0,
    multiple ? undefined : 1,
  );
  dispatch("drop", {
    acceptedFiles,
    rejectedFiles: selected.filter((file) => !accepted(file)),
  });
  if (input) input.value = "";
}
</script>

<button
  type="button"
  class="dropzone paisa-file-dropzone"
  class:is-dragging={dragging}
  onclick={() => input?.click()}
  ondragenter={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={(e) => {
    e.preventDefault();
    dragging = false;
  }}
  ondrop={(e: DragEvent) => {
    e.preventDefault();
    dragging = false;
    select(e.dataTransfer?.files || null);
  }}
>
  {@render children?.()}
</button>
<input
  bind:this={input}
  class="paisa-file-dropzone-input"
  type="file"
  {accept}
  {multiple}
  onchange={(event) => select(event.currentTarget.files)}
/>

<style>
.paisa-file-dropzone-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
