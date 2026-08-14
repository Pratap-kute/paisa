<script lang="ts">
  import _ from "lodash";

  export let options: { label: string; value: any }[];
  export let value: any;

  $: if (value && !options.find((option) => option.value === value) && !_.isEmpty(options)) {
    value = _.last(options).value;
  }
</script>

<div class="boxed-tabs" role="tablist">
  {#each options as option}
    <button
      type="button"
      role="tab"
      aria-selected={option.value === value}
      class="boxed-tab {option.value === value ? 'is-active' : ''}"
      on:click={() => (value = option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style lang="scss">
  .boxed-tabs {
    display: inline-flex;
    padding: 0.25rem;

    .boxed-tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 1.5rem;
      padding: 0 0.75rem;
      font-size: 0.75rem;
      border: none;
      outline: none;
      box-shadow: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      line-height: normal;

      &.is-active {
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
    }
  }
</style>
