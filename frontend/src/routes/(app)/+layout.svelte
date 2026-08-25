<script lang="ts">
import { afterNavigate } from "$app/navigation";
import AppShell from "$lib/shared/layout/AppShell.svelte";
import { willRefresh } from "../../store";
import type { Snippet } from "svelte";

interface Props {
  children?: Snippet;
}

let { children }: Props = $props();

let isBurger: boolean | null = $state(null);

afterNavigate(() => {
  isBurger = null;
});
</script>

{#key $willRefresh}
  <AppShell bind:isBurger>
    {@render children?.()}
  </AppShell>
{/key}
