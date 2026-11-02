<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import Button from "./Button.svelte";

  interface Props {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    // "danger" styles the confirm action as destructive.
    variant?: "default" | "danger";
    onconfirm: () => void;
    // Called when the dialog is dismissed without confirming (cancel button,
    // Escape or a click outside).
    oncancel?: () => void;
  }

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    onconfirm,
    oncancel,
  }: Props = $props();

  let confirmed = false;

  function confirm(close: () => void) {
    confirmed = true;
    close();
    onconfirm();
  }

  function handleClose() {
    if (!confirmed) oncancel?.();
    confirmed = false;
  }
</script>

<Dialog
  bind:open
  {title}
  {description}
  width="min(440px, calc(100vw - 32px))"
  onclose={handleClose}
>
  {#snippet footer({ close })}
    <Button variant="secondary" onclick={close}>{cancelLabel}</Button>
    <Button
      variant={variant === "danger" ? "danger" : "primary"}
      onclick={() => confirm(close)}>{confirmLabel}</Button
    >
  {/snippet}
</Dialog>
