<script lang="ts">
  import type { PageData } from "./$types";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

{#if data.journalMissing}
  <Page width="fluid">
    <Section>
      <div class="notification is-warning">
        The configured journal file does not exist and could not be created. Check the journal path
        and write permissions, or disable read-only mode before opening the editor.
      </div>
    </Section>
  </Page>
{:else}
  <div>Loading editor...</div>
{/if}
