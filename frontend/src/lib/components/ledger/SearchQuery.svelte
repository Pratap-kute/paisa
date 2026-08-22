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

<div class="paisa-search-query-container">
  <div class="paisa-search-query-icon">
    <i class="fa-solid fa-magnifying-glass text-xs"></i>
  </div>
  <div
    class="search-query-editor"
    bind:this={editorDom}
    role="searchbox"
    aria-label="Filter query"
  ></div>
</div>

<style lang="scss">
  .paisa-search-query-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-md, 0.375rem);
    transition: border-color var(--paisa-transition-fast), box-shadow var(--paisa-transition-fast);
    box-sizing: border-box;
    overflow: hidden;

    &:focus-within {
      border-color: var(--paisa-primary);
      box-shadow: 0 0 0 2px var(--paisa-primary-subtle);
    }
  }

  .paisa-search-query-icon {
    padding-left: 0.75rem;
    padding-right: 0.25rem;
    color: var(--paisa-muted-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
