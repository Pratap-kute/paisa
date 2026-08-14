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
