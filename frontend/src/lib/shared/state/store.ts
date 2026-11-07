import type { LedgerFileError } from "#lib/domain/ledger";
import type { SheetFileError } from "#lib/domain/ledger";
import type { SheetLineResult } from "#lib/shared/state/models";
import { Ref } from "./ref.svelte";
import dayjs from "dayjs";
import { dayjsExtent } from "#lib/shared/formatters/date";
import type { AccountTfIdf } from "#lib/shared/state/models";

export function now(): dayjs.Dayjs {
  const customNow = (globalThis as { __now?: dayjs.Dayjs }).__now;
  if (customNow) {
    return customNow;
  }
  return dayjs();
}

export interface EditorState {
  hasUnsavedChanges: boolean;
  undoDepth: number;
  redoDepth: number;
  errors: LedgerFileError[];
  output: string;
}

export const initialEditorState: EditorState = {
  hasUnsavedChanges: false,
  undoDepth: 0,
  redoDepth: 0,
  errors: [],
  output: "",
};

export interface SheetEditorState {
  hasUnsavedChanges: boolean;
  undoDepth: number;
  redoDepth: number;
  doc: string;
  pendingEval: boolean;
  evalDuration: number;
  currentLine: number;
  errors: SheetFileError[];
  results: SheetLineResult[];
}

export const initialSheetEditorState: SheetEditorState = {
  hasUnsavedChanges: false,
  undoDepth: 0,
  redoDepth: 0,
  currentLine: 0,
  doc: "",
  pendingEval: false,
  evalDuration: 0,
  errors: [],
  results: [],
};

export const editorState = new Ref<EditorState>(initialEditorState);
export const sheetEditorState = new Ref<SheetEditorState>(
  initialSheetEditorState,
);

export const month = new Ref<string>(now().format("YYYY-MM"));
export const year = new Ref<string>("");
export const dateRangeOption = new Ref<number>(3);

export const dateMin = new Ref<dayjs.Dayjs>(dayjs("1980", "YYYY"));
export const dateMax = new Ref<dayjs.Dayjs>(now());

export const dateRange = {
  get value() {
    if (dateRangeOption.value === -1) {
      return { from: dateMin.value, to: dateMax.value };
    }
    return {
      from: dateMax.value.subtract(dateRangeOption.value, "year"),
      to: dateMax.value,
    };
  },
};

export const theme = new Ref<string>("light");

const DELAY = 200;
const DEBOUNCE_DELAY = 200;

/**
 * Tracks whether data is loading. `delayed` follows it after a short pause so
 * a spinner does not flash for fast requests.
 */
class LoadingState {
  #current = new Ref(false);
  #delayed = new Ref(false);
  #timeoutId: ReturnType<typeof setTimeout> | undefined;

  get value() {
    return this.#current.value;
  }

  set value(next: boolean) {
    this.#current.value = next;
    clearTimeout(this.#timeoutId);
    this.#timeoutId = setTimeout(
      () => {
        this.#delayed.value = next;
      },
      next ? DELAY : DEBOUNCE_DELAY,
    );
  }

  get delayed() {
    return this.#delayed.value;
  }
}

export const loading = new LoadingState();

export const accountTfIdf = new Ref<AccountTfIdf | null>(null);

export function setAllowedDateRange(dates: dayjs.Dayjs[]) {
  const [start, end] = dayjsExtent(dates);
  if (start && end) {
    dateMin.value = start;
    dateMax.value = end;
  }
}

export const willRefresh = new Ref<number>(0);
// True while the app asks whether to discard unsaved editor changes before it
// reloads its data. The dialog lives in AppShell and settles it with
// confirmRefresh or cancelRefresh.
export const refreshNeedsConfirmation = new Ref<boolean>(false);

function reload() {
  willRefresh.value++;
}

/** Reloads the data, first asking when the editor holds unsaved changes. */
export function refresh() {
  if (editorState.value.hasUnsavedChanges) {
    refreshNeedsConfirmation.value = true;
    return;
  }
  reload();
}

export function confirmRefresh() {
  refreshNeedsConfirmation.value = false;
  editorState.value = { ...editorState.value, hasUnsavedChanges: false };
  reload();
}

export function cancelRefresh() {
  refreshNeedsConfirmation.value = false;
}
