import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelRefresh,
  confirmRefresh,
  editorState,
  refresh,
  refreshNeedsConfirmation,
  willRefresh,
} from "#lib/shared/state/store";

const dirty = (hasUnsavedChanges: boolean) =>
  (editorState.value = { ...editorState.value, hasUnsavedChanges });

describe("refresh", () => {
  beforeEach(() => {
    dirty(false);
    refreshNeedsConfirmation.value = false;
  });

  it("reloads straight away when nothing is unsaved", () => {
    const before = willRefresh.value;
    refresh();
    expect(willRefresh.value).toBe(before + 1);
    expect(refreshNeedsConfirmation.value).toBe(false);
  });

  it("asks first when the editor has unsaved changes", () => {
    dirty(true);
    const before = willRefresh.value;
    refresh();
    expect(refreshNeedsConfirmation.value).toBe(true);
    expect(willRefresh.value).toBe(before);
  });

  it("discarding reloads and clears the unsaved flag", () => {
    dirty(true);
    refresh();
    const before = willRefresh.value;
    confirmRefresh();
    expect(refreshNeedsConfirmation.value).toBe(false);
    expect(editorState.value.hasUnsavedChanges).toBe(false);
    expect(willRefresh.value).toBe(before + 1);
  });

  it("keeping the edits leaves everything as it was", () => {
    dirty(true);
    refresh();
    const before = willRefresh.value;
    cancelRefresh();
    expect(refreshNeedsConfirmation.value).toBe(false);
    expect(editorState.value.hasUnsavedChanges).toBe(true);
    expect(willRefresh.value).toBe(before);
  });
});
