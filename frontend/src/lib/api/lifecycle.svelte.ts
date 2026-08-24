import { isAbortError, normalizeApiError, type AppApiError } from "./errors";

export interface AsyncState<TArgs, TResult> {
  readonly data: TResult;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly error: AppApiError | null;
  run: (args: TArgs) => Promise<TResult | undefined>;
  refresh: () => Promise<TResult | undefined>;
  cancel: () => void;
}

export function createAsyncState<TArgs = void, TResult = unknown>(
  fetcher: (args: TArgs, signal: AbortSignal) => Promise<TResult>,
  initialValue: TResult = null as unknown as TResult,
): AsyncState<TArgs, TResult> {
  let data = $state<TResult>(initialValue);
  let loading = $state<boolean>(false);
  let refreshing = $state<boolean>(false);
  let error = $state<AppApiError | null>(null);

  let currentController: AbortController | null = null;
  let currentGeneration = 0;
  let lastArgs: TArgs | undefined = undefined;

  async function run(args: TArgs): Promise<TResult | undefined> {
    lastArgs = args;

    // Abort previous in-flight request for this instance
    if (currentController) {
      currentController.abort();
      currentController = null;
    }

    const controller = new AbortController();
    currentController = controller;
    const generation = ++currentGeneration;

    const hasExistingData = data !== null && data !== undefined;
    if (hasExistingData) {
      refreshing = true;
    } else {
      loading = true;
    }
    error = null;

    try {
      const result = await fetcher(args, controller.signal);

      // Protect against out-of-order stale response completion
      if (generation === currentGeneration) {
        data = result;
        loading = false;
        refreshing = false;
        error = null;
        currentController = null;
        return result;
      }
    } catch (err: unknown) {
      if (generation === currentGeneration) {
        loading = false;
        refreshing = false;
        currentController = null;

        if (isAbortError(err)) {
          // Cancellation is intentional and must not surface as UI error
          return undefined;
        }

        const normalized = normalizeApiError(err);
        error = normalized;
        throw normalized;
      }
    }

    return undefined;
  }

  async function refresh(): Promise<TResult | undefined> {
    return run(lastArgs as TArgs);
  }

  function cancel(): void {
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
    loading = false;
    refreshing = false;
  }

  return {
    get data() {
      return data;
    },
    get loading() {
      return loading;
    },
    get refreshing() {
      return refreshing;
    },
    get error() {
      return error;
    },
    run,
    refresh,
    cancel,
  };
}

export interface MutationState<TArgs, TResult> {
  readonly saving: boolean;
  readonly error: AppApiError | null;
  readonly result: TResult | null;
  run: (args: TArgs) => Promise<TResult>;
  reset: () => void;
}

export function createMutation<TArgs = void, TResult = unknown>(
  mutator: (args: TArgs) => Promise<TResult>,
): MutationState<TArgs, TResult> {
  let saving = $state<boolean>(false);
  let error = $state<AppApiError | null>(null);
  let result = $state<TResult | null>(null);

  let activePromise: Promise<TResult> | null = null;

  function run(args: TArgs): Promise<TResult> {
    // If a mutation is already in progress on this instance, return existing in-flight promise
    if (saving && activePromise) {
      return activePromise;
    }

    saving = true;
    error = null;

    activePromise = (async () => {
      try {
        const res = await mutator(args);
        result = res;
        saving = false;
        error = null;
        activePromise = null;
        return res;
      } catch (err: unknown) {
        saving = false;
        activePromise = null;
        const normalized = normalizeApiError(err);
        error = normalized;
        throw normalized;
      }
    })();

    return activePromise;
  }

  function reset(): void {
    saving = false;
    error = null;
    result = null;
    activePromise = null;
  }

  return {
    get saving() {
      return saving;
    },
    get error() {
      return error;
    },
    get result() {
      return result;
    },
    run,
    reset,
  };
}
