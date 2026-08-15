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
    color = null,
    subtitle = null
  }: Props = $props();
</script>

<div class="level-item {narrow ? 'is-narrow' : ''} has-text-left" class:small>
  <div>
    <p class="heading">{title}</p>
    {#if color}
      <p class="title" style="padding: 5px 0; color: {color};">{value}</p>
    {:else}
      <p class="title paisa-level-value">{value}</p>
    {/if}
    {#if !_.isEmpty(subtitle)}
      <div class="sub-title has-text-grey">{@html subtitle}</div>
    {/if}
  </div>
</div>

<style lang="scss">
  .paisa-level-value {
    color: var(--paisa-text-primary, #0f172a);
  }

  .level-item.small {
    .title {
      font-size: 1.25rem !important;
      line-height: 1.5rem !important;
    }
  }

  .heading {
    color: var(--paisa-text-secondary, #475569) !important;
    font-weight: 500 !important;
    font-size: 0.875rem !important;
    text-transform: capitalize !important;
    letter-spacing: normal !important;
    margin-bottom: 0 !important;
  }

  .title {
    font-weight: 800 !important;
    font-size: 1.75rem !important;
    line-height: 2rem !important;
    padding-left: 0 !important;
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }

  @media screen and (min-width: 1216px) {
    .title {
      font-size: 2.25rem !important;
      line-height: 2.5rem !important;
    }

    .level-item.small {
      .title {
        font-size: 1.5rem !important;
        line-height: 1.75rem !important;
      }
    }
  }

  .sub-title {
    font-weight: normal !important;
    font-size: 0.75rem !important;
  }
</style>
