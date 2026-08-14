<script lang="ts">
  interface Props {
    text: string;
  }

  let { text }: Props = $props();
</script>

<div class="columns">
  <div class="column is-12 has-text-centered has-text-grey pt-0">
    <div>
      <p class="custom-icon">{text}</p>
    </div>
  </div>
</div>
