<script lang="ts">
  import type { Snippet } from "svelte";

  type FieldLayout = "stacked" | "horizontal" | "grouped";

  interface Props {
    label?: string;
    labelFor?: string;
    required?: boolean;
    help?: string;
    error?: string;
    layout?: FieldLayout;
    hasAddons?: boolean;
    class?: string;
    extraAction?: Snippet;
    children?: Snippet;
  }

  let {
    label,
    labelFor,
    required = false,
    help,
    error,
    layout = "stacked",
    hasAddons = false,
    class: className = "",
    extraAction,
    children,
  }: Props = $props();
</script>

<div
  class="field {layout === 'horizontal' ? 'is-horizontal' : ''} {layout === 'grouped' ? 'is-grouped' : ''} {hasAddons ? 'has-addons' : ''} {className}"
>
  {#if label}
    <div class="field-label is-normal {layout === 'horizontal' ? '' : 'p-0 mb-1'}">
      <div class="is-flex is-justify-content-space-between is-align-items-center">
        <label class="label mb-0" for={labelFor}>
          {label}
          {#if required}
            <span class="has-text-danger ml-0.5" aria-hidden="true">*</span>
          {/if}
        </label>
        {#if extraAction}
          <div class="is-size-7">
            {@render extraAction()}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="field-body">
    <div class="field {hasAddons ? 'has-addons' : ''}">
      {@render children?.()}
      {#if error}
        <p class="help is-danger mt-1">{error}</p>
      {:else if help}
        <p class="help has-text-grey mt-1">{help}</p>
      {/if}
    </div>
  </div>
</div>
