<script lang="ts">
import { api } from "$lib/api";
import { goto } from "$app/navigation";
import FileModal from "$lib/features/ledger/components/FileModal.svelte";
import * as toast from "$lib/shared/ui/toast";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import Button from "$lib/shared/ui/Button.svelte";

let modalOpen = $state(false);
function openCreateModal() {
  modalOpen = true;
}

async function createFile(destinationFile: string) {
  destinationFile = destinationFile.trim() + ".paisa";
  const { saved, message } = await api.sheets.saveSheetFile({
    name: destinationFile,
    content: "",
  });

  if (saved) {
    toast.toast({
      message: `Created <b><a href="/more/sheets/${
        encodeURIComponent(
          destinationFile,
        )
      }">${destinationFile}</a></b>`,
      type: "is-success",
      duration: 5000,
    });

    await goto(`/more/sheets/${encodeURIComponent(destinationFile)}`);
  } else {
    toast.toast({
      message: `Failed to create ${destinationFile}. reason: ${message}`,
      type: "is-danger",
      duration: 10000,
    });
  }
}
</script>

<FileModal
  bind:open={modalOpen}
  on:save={(e) => createFile(e.detail)}
  label="Create"
  placeholder="scratch"
  help="Filename without any extension"
/>

<Page width="analysis">
  <PageHeader
    title="Sheets"
    description="Create and manage custom financial spreadsheets"
  />

  <Section>
    <div class="mt-8 flex flex-col items-center justify-center gap-2">
      <Button variant="primary" size="lg" onclick={() => openCreateModal()}>
        {#snippet icon()}
          <i class="fas fa-file-circle-plus"></i>
        {/snippet}
        Create
      </Button>
      <p
        class="text-sm font-medium text-[var(--paisa-muted-foreground)]">Create your first sheet</p>
    </div>
  </Section>
</Page>
