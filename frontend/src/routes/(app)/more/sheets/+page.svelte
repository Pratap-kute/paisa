<script lang="ts">
  import { goto } from "$app/navigation";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import { ajax } from "$lib/core/utils";
  import * as toast from "$lib/core/toast";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let modalOpen = $state(false);
  function openCreateModal() {
    modalOpen = true;
  }

  async function createFile(destinationFile: string) {
    destinationFile = destinationFile.trim() + ".paisa";
    const { saved, message } = await ajax("/api/sheets/save", {
      method: "POST",
      body: JSON.stringify({ name: destinationFile, content: "", operation: "create" }),
      background: true
    });

    if (saved) {
      toast.toast({
        message: `Created <b><a href="/more/sheets/${encodeURIComponent(
          destinationFile
        )}">${destinationFile}</a></b>`,
        type: "is-success",
        duration: 5000
      });

      await goto(`/more/sheets/${encodeURIComponent(destinationFile)}`);
    } else {
      toast.toast({
        message: `Failed to create ${destinationFile}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
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
    <div class="is-flex is-align-items-center is-justify-content-center mt-5">
      <div class="field">
        <p class="control">
          <button class="button is-medium is-link" onclick={(_e) => openCreateModal()}>
            <span class="icon is-small">
              <i class="fas fa-file-circle-plus"></i>
            </span>
            <span>Create</span>
          </button>
        </p>
        <p class="mt-2 has-text-grey has-text-bold">Create your first sheet</p>
      </div>
    </div>
  </Section>
</Page>
