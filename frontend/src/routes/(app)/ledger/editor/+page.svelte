<script lang="ts">
import type { PageData } from "./$types";
import Page from "$lib/shared/layout/Page.svelte";
import Section from "$lib/shared/layout/Section.svelte";

interface Props {
  data: PageData;
}

let { data }: Props = $props();
</script>

{#if data.journalMissing}
  <Page width="fluid">
  <Section>
    <div
      class="rounded-[var(--paisa-radius-md)] border border-[var(--paisa-warning)]/20 bg-[var(--paisa-warning-light)] px-4 py-3 text-sm text-[var(--paisa-foreground)]"
      role="alert"
    >
        The configured journal file does not exist and could not be created. Check the journal path
        and write permissions, or disable read-only mode before opening the editor.
      </div>
  </Section>
</Page>
{:else}
  <div
  class="flex items-center justify-center gap-3 py-16 text-sm text-[var(--paisa-muted-foreground)]">
  <div
    class="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paisa-border-strong)] border-t-[var(--paisa-primary)]"
  ></div>
  <span>Loading editor...</span>
</div>
{/if}
