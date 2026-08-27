<script lang="ts">
interface Props {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  class?: string;
}

let {
  orientation = "horizontal",
  decorative = true,
  class: className = "",
}: Props = $props();
</script>

<div
  role={decorative ? "none" : "separator"}
  aria-orientation={decorative ? undefined : orientation}
  class="paisa4-separator paisa4-separator-{orientation} {className}"
></div>
