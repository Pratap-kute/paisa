import { describe, expect, it, vi } from "vitest";
import { createAsyncState, createMutation } from "$lib/api/lifecycle.svelte";
import { ApiError } from "$lib/api/errors";

describe("Request Lifecycle & AsyncState", () => {
  it("transitions loading -> success", async () => {
    const fetcher = vi.fn().mockImplementation(async (id: string, _signal: AbortSignal) => {
      return { id, name: "Item " + id };
    });

    const state = createAsyncState(fetcher, null);
    expect(state.loading).toBe(false);
    expect(state.data).toBeNull();

    const promise = state.run("123");
    expect(state.loading).toBe(true);

    const res = await promise;
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.data).toEqual({ id: "123", name: "Item 123" });
    expect(res).toEqual({ id: "123", name: "Item 123" });
  });

  it("transitions loading -> error on failure", async () => {
    const fetcher = vi.fn().mockImplementation(async (_args: void, _signal: AbortSignal) => {
      throw new ApiError(500, "Internal Error");
    });

    const state = createAsyncState(fetcher, null);
    await expect(state.run()).rejects.toMatchObject({
      status: 500,
      message: "Internal Error",
    });

    expect(state.loading).toBe(false);
    expect(state.error).toMatchObject({
      status: 500,
      message: "Internal Error",
    });
    expect(state.data).toBeNull();
  });

  it("passes AbortSignal to fetcher and aborts on cancel()", async () => {
    let capturedSignal: AbortSignal | undefined;

    const fetcher = vi.fn().mockImplementation(async (_args: void, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const state = createAsyncState(fetcher, null);
    const runPromise = state.run();

    expect(state.loading).toBe(true);
    expect(capturedSignal?.aborted).toBe(false);

    state.cancel();
    expect(capturedSignal?.aborted).toBe(true);
    expect(state.loading).toBe(false);

    // Cancellation does not throw or surface as error
    const res = await runPromise;
    expect(res).toBeUndefined();
    expect(state.error).toBeNull();
  });

  it("prevents stale requests from overwriting newer successful state", async () => {
    let resolveFirst!: (val: string) => void;
    let resolveSecond!: (val: string) => void;

    const fetcher = vi.fn().mockImplementation(async (query: string, _signal: AbortSignal) => {
      if (query === "first") {
        return new Promise<string>((resolve) => { resolveFirst = resolve; });
      } else {
        return new Promise<string>((resolve) => { resolveSecond = resolve; });
      }
    });

    const state = createAsyncState(fetcher, "");

    // Start request A
    state.run("first");
    // Start request B (supersedes A)
    state.run("second");

    // Resolve request B first
    resolveSecond("Result B");
    await new Promise((r) => setTimeout(r, 10));
    expect(state.data).toBe("Result B");

    // Resolve request A later
    resolveFirst("Result A (stale)");
    await new Promise((r) => setTimeout(r, 10));

    // Stale result A must not overwrite newer result B
    expect(state.data).toBe("Result B");
  });

  it("stale request failure cannot overwrite newer successful state", async () => {
    let rejectFirst!: (err: Error) => void;
    let resolveSecond!: (val: string) => void;

    const fetcher = vi.fn().mockImplementation(async (query: string, _signal: AbortSignal) => {
      if (query === "first") {
        return new Promise<string>((_res, rej) => { rejectFirst = rej; });
      } else {
        return new Promise<string>((res) => { resolveSecond = res; });
      }
    });

    const state = createAsyncState(fetcher, "");

    state.run("first");
    state.run("second");

    resolveSecond("Success B");
    await new Promise((r) => setTimeout(r, 10));
    expect(state.data).toBe("Success B");
    expect(state.error).toBeNull();

    // Reject stale first request
    rejectFirst(new Error("Network Error"));
    await new Promise((r) => setTimeout(r, 10));

    expect(state.data).toBe("Success B");
    expect(state.error).toBeNull();
  });

  it("retains existing data on refresh failure", async () => {
    let shouldFail = false;
    const fetcher = vi.fn().mockImplementation(async (_args: void, _signal: AbortSignal) => {
      if (shouldFail) {
        throw new ApiError(503, "Service Unavailable");
      }
      return ["Initial Data"];
    });

    const state = createAsyncState(fetcher, [] as string[]);
    await state.run();
    expect(state.data).toEqual(["Initial Data"]);

    // Attempt refresh that fails
    shouldFail = true;
    await expect(state.refresh()).rejects.toMatchObject({ status: 503 });

    // Existing data is preserved
    expect(state.data).toEqual(["Initial Data"]);
    expect(state.refreshing).toBe(false);
    expect(state.error).toMatchObject({ status: 503 });
  });

  it("cancel followed immediately by run works cleanly", async () => {
    const fetcher = vi.fn().mockImplementation(async (val: number, _signal: AbortSignal) => {
      return val * 2;
    });

    const state = createAsyncState(fetcher, 0);
    state.run(5);
    state.cancel();

    const res = await state.run(10);
    expect(res).toBe(20);
    expect(state.data).toBe(20);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe("MutationState Lifecycle", () => {
  it("manages saving state and preserves exact domain result", async () => {
    interface SavePayload {
      name: string;
      content: string;
    }
    interface SaveResult {
      saved: boolean;
      synced: boolean;
      errors: string[];
      message: string;
    }

    const mutator = vi.fn().mockImplementation(async (payload: SavePayload): Promise<SaveResult> => {
      return {
        saved: true,
        synced: false,
        errors: ["Sync skipped"],
        message: `Saved ${payload.name}`,
      };
    });

    const mutation = createMutation(mutator);
    expect(mutation.saving).toBe(false);
    expect(mutation.result).toBeNull();

    const promise = mutation.run({ name: "journal.ledger", content: "..." });
    expect(mutation.saving).toBe(true);

    const res = await promise;
    expect(mutation.saving).toBe(false);
    expect(mutation.error).toBeNull();
    expect(mutation.result).toEqual({
      saved: true,
      synced: false,
      errors: ["Sync skipped"],
      message: "Saved journal.ledger",
    });
    expect(res.saved).toBe(true);
    expect(res.synced).toBe(false);
  });

  it("prevents duplicate concurrent triggers and returns existing promise", async () => {
    let callCount = 0;
    const mutator = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return { id: 1 };
    });

    const mutation = createMutation(mutator);
    const p1 = mutation.run();
    const p2 = mutation.run(); // duplicate trigger

    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
    expect(callCount).toBe(1);
  });

  it("distinguishes mutation network failure from domain partial success", async () => {
    const networkFailMutator = vi.fn().mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });

    const mutation = createMutation(networkFailMutator);
    await expect(mutation.run()).rejects.toMatchObject({
      message: "Failed to fetch",
    });

    expect(mutation.saving).toBe(false);
    expect(mutation.error?.message).toBe("Failed to fetch");
    expect(mutation.result).toBeNull();
  });
});
