<script lang="ts">
  import LoadingState from "#lib/shared/ui/LoadingState.svelte";
  import type { PageData } from "./$types";
  import Page from "#lib/shared/layout/Page.svelte";
  import Section from "#lib/shared/layout/Section.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

{#if data.journalMissing}
  <Page width="fluid">
    <Section>
      <div
        class="rounded-[var(--paisa-radius-md)] border border-[var(--paisa-warning)]/20 bg-warning-subtle px-4 py-3 text-sm text-foreground"
        role="alert"
      >
        The configured journal file does not exist and could not be created.
        Check the journal path and write permissions, or disable read-only mode
        before opening the editor.
      </div>
    </Section>
  </Page>
{:else}
  <LoadingState message="Loading editor..." />
{/if}
