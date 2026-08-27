<script lang="ts">
import Tabs from "./Tabs.svelte";

interface Props {
  onchange?: (value: string) => void;
}
let { onchange }: Props = $props();
let value = $state("overview");
</script>

<Tabs bind:value {onchange} options={[
  { label: "Overview", value: "overview" },
  { label: "Details", value: "details" },
]}>
  {#snippet panel(option)}
    <p>{option.label} panel</p>
  {/snippet}
</Tabs>
