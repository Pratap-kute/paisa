<script lang="ts">
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

{#if data.journalMissing}
  <section class="section">
    <div class="container is-fluid">
      <div class="notification is-warning">
        The configured journal file does not exist and could not be created. Check the journal path
        and write permissions, or disable read-only mode before opening the editor.
      </div>
    </div>
  </section>
{:else}
  <div>Loading editor...</div>
{/if}
