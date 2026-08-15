import type { LedgerFileError, SheetFileError, SheetLineResult } from "../core/utils";



export interface EditorState {
  hasUnsavedChanges: boolean;
  undoDepth: number;
  redoDepth: number;
  errors: LedgerFileError[];
  output: string;
}

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

class EditorStateManager {
  state = $state<EditorState>({
    hasUnsavedChanges: false,
    undoDepth: 0,
    redoDepth: 0,
    errors: [],
    output: "",
  });

  reset() {
    this.state = {
      hasUnsavedChanges: false,
      undoDepth: 0,
      redoDepth: 0,
      errors: [],
      output: "",
    };
  }
}

class SheetEditorStateManager {
  state = $state<SheetEditorState>({
    hasUnsavedChanges: false,
    undoDepth: 0,
    redoDepth: 0,
    currentLine: 0,
    doc: "",
    pendingEval: false,
    evalDuration: 0,
    errors: [],
    results: [],
  });

  reset() {
    this.state = {
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
  }
}

export const editorStateManager = new EditorStateManager();
export const sheetEditorStateManager = new SheetEditorStateManager();
