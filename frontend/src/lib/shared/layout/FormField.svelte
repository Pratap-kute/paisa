<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    id: string;
    label: string;
    description?: string;
    error?: string;
    warning?: string;
    required?: boolean;
    disabled?: boolean;
    children?: Snippet<[{ describedby: string | undefined; invalid: boolean; disabled: boolean }]>;
  }

  let {
    id,
    label,
    description,
    error,
    warning,
    required = false,
    disabled = false,
    children,
  }: Props = $props();

  const descriptionId = $derived(description ? `${id}-description` : undefined);
  const messageId = $derived(error || warning ? `${id}-message` : undefined);
  const describedby = $derived([descriptionId, messageId].filter(Boolean).join(" ") || undefined);
</script>

<div class="paisa4-form-field" data-disabled={disabled || undefined}>
  <label class="paisa4-form-label" for={id}>
    {label}
    {#if required}<span aria-hidden="true">*</span>{/if}
  </label>
  {#if description}
    <p id={descriptionId} class="paisa4-form-description">{description}</p>
  {/if}
  <div class="paisa4-form-control">
    {@render children?.({ describedby, invalid: Boolean(error), disabled })}
  </div>
  {#if error}
    <p id={messageId} class="paisa4-form-error">{error}</p>
  {:else if warning}
    <p id={messageId} class="paisa4-form-warning">{warning}</p>
  {/if}
</div>

