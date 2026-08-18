<script lang="ts">
  import _ from "lodash";

  interface Props {
    title: string;
    value: string;
    small?: boolean;
    narrow?: boolean;
    color?: string;
    subtitle?: string;
  }

  let {
    title,
    value,
    small = false,
    narrow = false,
    color = undefined,
    subtitle = undefined
  }: Props = $props();
</script>

<div class="level-item {narrow ? 'is-narrow' : ''} has-text-left" class:small>
  <div>
    <p class="heading">{title}</p>
    {#if color}
      <p class="title" style="color: {color};">{value}</p>
    {:else}
      <p class="title paisa-level-value">{value}</p>
    {/if}
    {#if !_.isEmpty(subtitle)}
      <div class="sub-title">{@html subtitle}</div>
    {/if}
  </div>
</div>

<style lang="scss">
  .level-item {
    display: block !important;
    text-align: left;
    flex: 1 1 0%;
    min-width: 0;
    margin: 0;

    &.is-narrow {
      flex: 0 0 auto;
    }

    > div {
      width: 100%;
      text-align: left;
      min-width: 0;
    }
  }

  .heading {
    color: var(--paisa-text-secondary);
    font-weight: var(--paisa-font-weight-medium);
    font-size: var(--paisa-font-size-sm);
    text-transform: capitalize;
    letter-spacing: normal;
    margin-bottom: var(--paisa-space-1);
  }

  .title {
    color: var(--paisa-text-primary);
    font-weight: var(--paisa-font-weight-bold);
    font-size: clamp(1rem, 2.4vw, var(--paisa-font-size-metric));
    font-variant-numeric: tabular-nums;
    line-height: var(--paisa-line-height-tight);
    padding: 0.125rem 0;
    margin-bottom: 0;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .paisa-level-value {
    color: var(--paisa-text-primary);
  }

  .level-item.small .title {
    font-size: clamp(0.95rem, 2vw, var(--paisa-font-size-xl));
    line-height: var(--paisa-line-height-tight);
  }

  .sub-title {
    color: var(--paisa-text-muted);
    font-weight: var(--paisa-font-weight-normal);
    font-size: var(--paisa-font-size-xs);
    margin-top: var(--paisa-space-1);
  }
</style>
