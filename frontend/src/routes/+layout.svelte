<script lang="ts">
import { browser } from "$app/environment";
import { getColorPreference } from "$lib/shared/browser/theme";
import ToastContainer from "$lib/shared/ui/ToastContainer.svelte";
import TooltipProvider from "$lib/shared/ui/TooltipProvider.svelte";
interface Props {
  children?: import("svelte").Snippet;
}

let { children }: Props = $props();

if (browser) {
  const theme = getColorPreference();
  document.firstElementChild?.setAttribute("data-theme", theme);
}
</script>

<TooltipProvider>
  {@render children?.()}
</TooltipProvider>
<ToastContainer />
