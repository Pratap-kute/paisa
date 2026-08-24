<script lang="ts">
  import { page } from "$app/stores";
</script>

<div class="flex min-h-screen items-center justify-center bg-[var(--paisa-background)] p-6">
  <div class="w-full max-w-lg">
    {#if $page.status === 404 || $page.error?.status === 404 || $page.error?.message === "Not found"}
      <div class="overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-danger)] bg-[var(--paisa-surface)]">
        <div class="bg-[var(--paisa-danger)] px-4 py-3 text-sm font-semibold text-white">
          Page not found
        </div>
        <div class="space-y-3 p-4 text-sm text-[var(--paisa-foreground)]">
          <p>
            The page you are looking for does not exist. It may have been moved, or removed
            altogether. Perhaps you can return back to the site's
            <a href="/" class="text-[var(--paisa-primary)] underline">homepage</a>
            and see if you can find what you are looking for.
          </p>
        </div>
      </div>
    {:else}
      <div class="overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-danger)] bg-[var(--paisa-surface)]">
        <div class="bg-[var(--paisa-danger)] px-4 py-3 text-sm font-semibold text-white">
          Something Went Wrong
        </div>
        <div class="space-y-3 p-4 text-sm text-[var(--paisa-foreground)]">
          <p>Paisa has encountered a critical error</p>
          <p>{$page.error.message}</p>
          {#if $page.error.stack}
            <pre class="overflow-x-auto rounded-[var(--paisa-radius-sm)] bg-[var(--paisa-surface-hover)] p-3 text-xs">{ $page.error.stack }</pre>
          {/if}
          <p>
            Please report this issue at
            <a href="https://github.com/Pratap-kute/paisa/issues" class="text-[var(--paisa-primary)] underline">
              https://github.com/Pratap-kute/paisa/issues
            </a>. Closing and reopening the app may help.
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>
