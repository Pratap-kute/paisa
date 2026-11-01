import { beforeEach, describe, expect, it } from "bun:test";
import { get } from "svelte/store";
import {
  cancelRefresh,
  confirmRefresh,
  editorState,
  refresh,
  refreshNeedsConfirmation,
  willRefresh,
} from "./store.ts";

const dirty = (hasUnsavedChanges: boolean) =>
  editorState.update((current) => ({ ...current, hasUnsavedChanges }));

describe("refresh", () => {
  beforeEach(() => {
    dirty(false);
    refreshNeedsConfirmation.set(false);
  });

  it("reloads straight away when nothing is unsaved", () => {
    const before = get(willRefresh);
    refresh();
    expect(get(willRefresh)).toBe(before + 1);
    expect(get(refreshNeedsConfirmation)).toBe(false);
  });

  it("asks first when the editor has unsaved changes", () => {
    dirty(true);
    const before = get(willRefresh);
    refresh();
    expect(get(refreshNeedsConfirmation)).toBe(true);
    expect(get(willRefresh)).toBe(before);
  });

  it("discarding reloads and clears the unsaved flag", () => {
    dirty(true);
    refresh();
    const before = get(willRefresh);
    confirmRefresh();
    expect(get(refreshNeedsConfirmation)).toBe(false);
    expect(get(editorState).hasUnsavedChanges).toBe(false);
    expect(get(willRefresh)).toBe(before + 1);
  });

  it("keeping the edits leaves everything as it was", () => {
    dirty(true);
    refresh();
    const before = get(willRefresh);
    cancelRefresh();
    expect(get(refreshNeedsConfirmation)).toBe(false);
    expect(get(editorState).hasUnsavedChanges).toBe(true);
    expect(get(willRefresh)).toBe(before);
  });
});
