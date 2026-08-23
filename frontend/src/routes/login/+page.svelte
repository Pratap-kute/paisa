<script lang="ts">
  import { goto } from "$app/navigation";
  import Logo from "$lib/components/layout/Logo.svelte";
  import { login } from "$lib/core/utils";
  import Button from "$lib/components/ui/Button.svelte";
  import FormField from "$lib/components/layout/FormField.svelte";
  import Input from "$lib/components/ui/Input.svelte";
import { isEmpty } from "$lib/core/collection";
  
  let username = $state("");
  let password = $state("");

  let invalid = $state(false);
  let invalidErrorMessage = $state("");

  let loginDisabled = $derived(isEmpty(username) || isEmpty(password));

  async function tryLogin() {
    if (loginDisabled) return;

    const { success, error } = await login(username, password);
    invalid = !success;
    if (success) {
      goto("/");
    } else if (error) {
      invalidErrorMessage = error;
    }
  }
</script>

<svelte:head>
  <title>Login — Paisa</title>
</svelte:head>

<main
  class="grid min-h-screen place-items-center p-6"
  style="background: var(--paisa-canvas-bg);"
>
  <div
    class="w-full max-w-[26rem] rounded-[var(--paisa-radius-lg)] border p-6 shadow-[var(--paisa-shadow-md)]"
    style="border-color: var(--paisa-login-card-border); background: var(--paisa-login-card-bg);"
  >
    <div class="mb-4 flex items-center justify-center gap-2">
      <Logo size={32} />
      <a
        href="https://paisa.fyi"
        class="text-3xl font-semibold text-[var(--paisa-primary)] no-underline hover:underline"
      >
        Paisa
      </a>
    </div>

    <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); tryLogin(); }}>
      <FormField id="username" label="Username">
        {#snippet children()}
          <Input id="username" type="text" size="lg" bind:value={username} />
        {/snippet}
      </FormField>

      <FormField id="password" label="Password" error={invalid ? invalidErrorMessage : undefined}>
        {#snippet children()}
          <Input id="password" type="password" size="lg" bind:value={password} />
        {/snippet}
      </FormField>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        class="!w-full !font-semibold"
        disabled={loginDisabled}
      >
        Login
      </Button>
    </form>
  </div>
</main>
