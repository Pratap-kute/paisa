<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description?: string;
    children?: Snippet;
  }

  let { title, description, children }: Props = $props();
</script>

<section class="paisa4-form-section">
  <div class="paisa4-form-section-header">
    <h2>{title}</h2>
    {#if description}<p>{description}</p>{/if}
  </div>
  <div class="paisa4-form-section-body">
    {@render children?.()}
  </div>
</section>

