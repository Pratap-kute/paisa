import type { LedgerFileError } from "#lib/domain/ledger";
import type { SheetFileError } from "#lib/domain/ledger";
import type { SheetLineResult } from "#lib/shared/state/models";
import { derived, get, writable } from "svelte/store";
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

export const editorState = writable<EditorState>(initialEditorState);
export const sheetEditorState = writable<SheetEditorState>(
  initialSheetEditorState,
);

export const month = writable<string>(now().format("YYYY-MM"));
export const year = writable<string>("");
export const dateRangeOption = writable<number>(3);

export const dateMin = writable<dayjs.Dayjs>(dayjs("1980", "YYYY"));
export const dateMax = writable<dayjs.Dayjs>(now());

export const dateRange = derived(
  [dateMin, dateMax, dateRangeOption],
  ([$dateMin, $dateMax, $dateRangeOption]) => {
    if ($dateRangeOption === -1) {
      return { from: $dateMin, to: $dateMax };
    } else {
      return {
        from: $dateMax.subtract($dateRangeOption, "year"),
        to: $dateMax,
      };
    }
  },
);

export const theme = writable<string>("light");

export const loading = writable<boolean>(false);

const DELAY = 200;
const DEBOUNCE_DELAY = 200;

let timeoutId: NodeJS.Timeout;
export const delayedLoading = derived(
  [loading],
  ([$l], set) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(
      () => {
        return set($l);
      },
      $l ? DELAY : DEBOUNCE_DELAY,
    );
  },
  false,
);

export const delayedUnLoading = delayedLoading;

export const accountTfIdf = writable<AccountTfIdf | null>(null);

export function setAllowedDateRange(dates: dayjs.Dayjs[]) {
  const [start, end] = dayjsExtent(dates);
  if (start && end) {
    dateMin.set(start);
    dateMax.set(end);
  }
}

export const willRefresh = writable<number>(0);
// True while the app asks whether to discard unsaved editor changes before it
// reloads its data. The dialog lives in AppShell and settles it with
// confirmRefresh or cancelRefresh.
export const refreshNeedsConfirmation = writable<boolean>(false);

function reload() {
  willRefresh.update((n) => n + 1);
}

/** Reloads the data, first asking when the editor holds unsaved changes. */
export function refresh() {
  if (get(editorState).hasUnsavedChanges) {
    refreshNeedsConfirmation.set(true);
    return;
  }
  reload();
}

export function confirmRefresh() {
  refreshNeedsConfirmation.set(false);
  editorState.update((current) => ({ ...current, hasUnsavedChanges: false }));
  reload();
}

export function cancelRefresh() {
  refreshNeedsConfirmation.set(false);
}
