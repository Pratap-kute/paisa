<script lang="ts">
  import { browser } from "$app/environment";
  import { getColorPreference } from "$lib/core/utils";
  import ToastContainer from "$lib/components/ui/ToastContainer.svelte";
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  if (browser) {
    const theme = getColorPreference();
    document.firstElementChild?.setAttribute("data-theme", theme);
  }
</script>

{@render children?.()}
<ToastContainer />
