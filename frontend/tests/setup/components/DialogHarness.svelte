<script lang="ts">
  import Dialog from "$lib/shared/ui/Dialog.svelte";
</script>

<Dialog title="Harness dialog" description="Dialog test body">
  {#snippet trigger()}Open harness dialog{/snippet}
  {#snippet children({ close })}
    <button onclick={close}>Close from body</button>
  {/snippet}
</Dialog>
