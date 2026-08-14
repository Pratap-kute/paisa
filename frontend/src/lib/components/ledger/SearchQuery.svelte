<script lang="ts">
  import { run } from 'svelte/legacy';

  import { createEditor } from "$lib/editors/search_query_editor";
  import type { EditorView } from "codemirror";

  let editorDom: HTMLElement = $state();
  interface Props {
    autocomplete: Record<string, string[]>;
  }

  let { autocomplete }: Props = $props();
  let editor: EditorView = $state();

  run(() => {
    if (autocomplete && editorDom) {
      if (editor) {
        editor.destroy();
      }

      editor = createEditor("", editorDom, autocomplete);
    }
  });
</script>

<div class="search-query-editor" bind:this={editorDom}></div>
