<script lang="ts">
interface Props {
  id?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  describedby?: string;
  invalid?: boolean;
  class?: string;
  oninput?: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
}

let {
  id,
  name,
  value = $bindable(""),
  placeholder = "",
  rows = 4,
  disabled = false,
  readonly = false,
  required = false,
  describedby,
  invalid = false,
  class: className = "",
  oninput,
}: Props = $props();
</script>

<textarea
  {id}
  {name}
  bind:value
  {placeholder}
  {rows}
  {disabled}
  {readonly}
  {required}
  aria-describedby={describedby}
  aria-invalid={invalid || undefined}
  class="paisa4-control paisa4-textarea {className}"
  {oninput}
></textarea>
