<script lang="ts">
  import { goto } from "$app/navigation";
  import Logo from "$lib/components/layout/Logo.svelte";
  import { login } from "$lib/core/utils";
  import _ from "lodash";
  let username = $state("");
  let password = $state("");

  let invalid = $state(false);
  let invalidErrorMessage = $state("");

  let loginDisabled = $derived(_.isEmpty(username) || _.isEmpty(password));

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

<section class="section m-0 p-0 paisa-login-section">
  <div class="container is-max-tablet">
    <div class="columns is-centered">
      <div class="column is-12-mobile is-8-tablet is-6-desktop">
        <div class="box paisa-login-card">
          <div class="paisa-login-brand">
            <div class="mr-2"><Logo size={32} /></div>
            <div class="is-size-3">
              <a href="https://paisa.fyi" class="is-primary-color">Paisa</a>
            </div>
          </div>
          <form onsubmit={(e) => { e.preventDefault(); tryLogin(); }}>
            <div class="field">
              <label for="username" class="label paisa-login-label">Username</label>
              <div class="control">
                <input id="username" class="input paisa-login-input" type="text" bind:value={username} />
              </div>
            </div>

            <div class="field">
              <label for="password" class="label paisa-login-label">Password</label>
              <div class="control">
                <input id="password" class="input paisa-login-input" type="password" bind:value={password} />
              </div>
              {#if invalid}
                <p class="help is-danger">{invalidErrorMessage}</p>
              {/if}
            </div>

            <div class="field mt-5 mb-0">
              <div class="control">
                <button class="button is-primary paisa-login-button" disabled={loginDisabled}>Login</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>
