<script lang="ts">
  import { createEditor } from "$lib/editors/search_query_editor";

  let editorDom: HTMLElement = $state();
  interface Props {
    autocomplete: Record<string, string[]>;
  }

  let { autocomplete }: Props = $props();

  $effect(() => {
    if (autocomplete && editorDom) {
      const editor = createEditor("", editorDom, autocomplete);
      return () => {
        editor.destroy();
      };
    }
  });
</script>

<div class="search-query-editor" bind:this={editorDom}></div>
