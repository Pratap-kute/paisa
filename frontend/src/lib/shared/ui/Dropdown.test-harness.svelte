<script lang="ts">
import Dropdown from "./Dropdown.svelte";
import DropdownItem from "./DropdownItem.svelte";

interface Props {
  onselect?: () => void;
}
let { onselect }: Props = $props();
</script>

<Dropdown>
  {#snippet trigger(props)}
    <button {...props} type="button">Actions</button>
  {/snippet}
  {#snippet children()}
    <DropdownItem onselect={onselect}>Edit</DropdownItem>
    <DropdownItem>Delete</DropdownItem>
  {/snippet}
</Dropdown>
