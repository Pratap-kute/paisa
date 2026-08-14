<script lang="ts">
  import ToastContainer from "$lib/components/ui/ToastContainer.svelte";
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

{@render children?.()}
<ToastContainer />
