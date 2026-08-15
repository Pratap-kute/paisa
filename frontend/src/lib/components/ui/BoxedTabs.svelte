<script lang="ts">
  import _ from "lodash";

  interface Props {
    options: { label: string; value: any }[];
    value: any;
  }

  let { options, value = $bindable() }: Props = $props();

  $effect(() => {
    if (value && !options.find((option) => option.value === value) && !_.isEmpty(options)) {
      value = _.last(options).value;
    }
  });
</script>

<div class="boxed-tabs" role="tablist">
  {#each options as option}
    <button
      type="button"
      role="tab"
      aria-selected={option.value === value}
      class="boxed-tab {option.value === value ? 'is-active' : ''}"
      onclick={() => (value = option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
