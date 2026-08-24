<script lang="ts">
  interface Props {
    width?: string;
    height?: string;
    radius?: "sm" | "md" | "lg" | "full";
    class?: string;
    label?: string;
  }

  let {
    width = "100%",
    height = "1rem",
    radius = "md",
    class: className = "",
    label = "Loading",
  }: Props = $props();
</script>

<div
  class="paisa4-skeleton paisa4-radius-{radius} {className}"
  style:width
  style:height
  role="status"
  aria-label={label}
></div>

