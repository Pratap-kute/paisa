import { beforeNavigate, goto } from "$app/navigation";

/**
 * Asks before leaving a page that has unsaved changes, with an in-app dialog
 * instead of the browser's confirm(). Render a ConfirmDialog bound to the
 * returned `open`, wired to `leave` and `stay`.
 *
 * Navigation started by the page itself should `await guard.ask()` first.
 * Navigation started elsewhere (links, the back button) is cancelled, asked
 * about, and repeated once the user chooses to leave. Closing the tab or
 * reloading can only use the browser's own prompt.
 */
export function createLeaveGuard(
  isDirty: () => boolean,
  markClean: () => void,
) {
  let open = $state(false);
  let pending: ((leave: boolean) => void) | undefined;

  function settle(leave: boolean) {
    open = false;
    const resolve = pending;
    pending = undefined;
    if (leave) markClean();
    resolve?.(leave);
  }

  /** Resolves true when it is fine to leave: clean, or the user chose to. */
  function ask(): Promise<boolean> {
    if (!isDirty()) return Promise.resolve(true);
    settle(false);
    open = true;
    return new Promise((resolve) => (pending = resolve));
  }

  beforeNavigate(({ cancel, to, willUnload }) => {
    if (!isDirty()) return;
    cancel();
    if (willUnload || !to) return;
    const target = to.url;
    void ask().then((leave) => {
      if (leave) void goto(target);
    });
  });

  return {
    get open() {
      return open;
    },
    ask,
    leave: () => settle(true),
    stay: () => settle(false),
  };
}
