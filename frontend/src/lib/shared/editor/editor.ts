import { api } from "$lib/api";
import { ledger } from "$lib/editors/ledger_parser";
import { StreamLanguage } from "@codemirror/language";
import { EditorView, type KeyBinding, keymap } from "@codemirror/view";
import { EditorState as State } from "@codemirror/state";
import { fullEditorExtensions } from "$lib/shared/editor/base";
import {
  history,
  historyKeymap,
  redoDepth,
  undoDepth,
} from "@codemirror/commands";
import {
  type Diagnostic,
  linter,
  lintGutter,
  lintKeymap,
} from "@codemirror/lint";
import { editorState, initialEditorState } from "$lib/state/store";
import {
  autocompletion,
  completeFromList,
  type CompletionContext,
  completionKeymap,
  ifIn,
} from "@codemirror/autocomplete";
import { MergeView } from "@codemirror/merge";
import { schedulePlugin } from "$lib/domain/transaction_tag";
import dayjs from "dayjs";
import { assign, map } from "$lib/shared/utils/collection";

export { editorState } from "$lib/state/store";

async function lint(editor: EditorView): Promise<Diagnostic[]> {
  const doc = editor.state.doc;
  const response = await api.editor.validateEditorFile({
    name: "",
    content: editor.state.doc.toString(),
  });

  editorState.update((current) =>
    assign({}, current, {
      errors: response.errors || [],
      output: response.output,
    })
  );

  return map(response.errors || [], (error) => {
    const lineNum = error.line_from || error.line || 1;
    const safeLineNum = Math.min(Math.max(1, lineNum), doc.lines);
    const lineFrom = doc.line(safeLineNum);
    const lineTo = doc.line(
      error.line_to
        ? Math.min(Math.max(1, error.line_to), doc.lines)
        : safeLineNum,
    );
    return {
      message: error.message,
      severity: "error",
      from: lineFrom.from,
      to: lineTo.to,
    };
  });
}

export function createDiffEditor(
  oldContent: string,
  newContent: string,
  dom: Element,
) {
  const extensions = [
    fullEditorExtensions,
    State.readOnly.of(true),
    StreamLanguage.define(ledger),
    history(),
    keymap.of(historyKeymap),
    lintGutter(),
    linter(lint),
    keymap.of(lintKeymap),
  ];
  return new MergeView({
    a: { extensions: extensions, doc: oldContent },
    b: { extensions: extensions, doc: newContent },
    parent: dom,
    collapseUnchanged: {},
  });
}

export function createEditor(
  content: string,
  dom: Element,
  opts: {
    autocompletions?: Record<string, string[]>;
    readonly?: boolean;
    keybindings?: readonly KeyBinding[];
  },
) {
  editorState.set(initialEditorState);

  return new EditorView({
    extensions: [
      keymap.of(opts.keybindings || []),
      fullEditorExtensions,
      State.readOnly.of(!!opts.readonly),
      StreamLanguage.define(ledger),
      lintGutter(),
      linter(lint),
      keymap.of(lintKeymap),
      history(),
      keymap.of(historyKeymap),
      autocompletion({
        override: [
          (context: CompletionContext) => {
            if (context.matchBefore(/^20$/)) {
              return completeFromList([dayjs().format("YYYY/MM/DD") + " "])(
                context,
              );
            }
            return null;
          },
          ...map(
            opts.autocompletions || [],
            (options: string[], node) =>
              ifIn([node], completeFromList(options)),
          ),
        ],
      }),
      keymap.of(completionKeymap),
      EditorView.updateListener.of((viewUpdate) => {
        editorState.update((current) =>
          assign({}, current, {
            hasUnsavedChanges: current.hasUnsavedChanges ||
              viewUpdate.docChanged,
            undoDepth: undoDepth(viewUpdate.state),
            redoDepth: redoDepth(viewUpdate.state),
          })
        );
      }),
      schedulePlugin,
    ],
    doc: content,
    parent: dom,
  });
}

export function moveToEnd(editor: EditorView) {
  editor.dispatch(
    editor.state.update({
      effects: EditorView.scrollIntoView(editor.state.doc.length, { y: "end" }),
    }),
  );
}

export function moveToLine(
  editor: EditorView,
  lineNumber: number,
  cursor = false,
) {
  try {
    const line = editor.state.doc.line(lineNumber);
    editor.dispatch(
      editor.state.update({
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      }),
    );

    if (cursor) {
      editor.dispatch({ selection: { anchor: line.from, head: line.from } });
    }
  } catch (_e) {
    // ignore invalid line number
  }
}

export function updateContent(editor: EditorView, content: string) {
  const head = editor.state.selection.main.head;
  const line = editor.state.doc.lineAt(head);
  const lineNumber = line.number;
  const column = head - line.from;
  editor.dispatch(
    editor.state.update({
      changes: { from: 0, to: editor.state.doc.length, insert: content },
    }),
  );

  const newLine = editor.state.doc.line(lineNumber);
  const newColumn = Math.min(newLine.from + column, newLine.to);
  editor.dispatch({ selection: { anchor: newColumn, head: newColumn } });
}

export function focus(editor: EditorView, retry = 5) {
  if (!editor.hasFocus) {
    editor.focus();
    if (!editor.hasFocus && retry > 0) {
      setTimeout(
        () => {
          try {
            focus(editor, retry - 1);
          } catch (_e) {
            // ignore
          }
        },
        (5 - retry) * 100 + 100,
      );
    }
  }
}
