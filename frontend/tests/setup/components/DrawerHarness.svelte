<script lang="ts">
  import Drawer from "$lib/shared/ui/Drawer.svelte";
</script>

<Drawer title="Harness drawer" description="Drawer test body">
  {#snippet trigger()}Open harness drawer{/snippet}
  {#snippet children({ close })}
    <button onclick={close}>Close drawer body</button>
  {/snippet}
</Drawer>
