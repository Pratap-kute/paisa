import type { LedgerFileError } from "$lib/core/utils";
import { handlebars } from "./handlebars_parser";
import { StreamLanguage } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import { fullEditorExtensions } from "$lib/shared/editor/base";
import {
  history,
  historyKeymap,
  insertTab,
  redoDepth,
  undoDepth,
} from "@codemirror/commands";
import {
  type Diagnostic,
  linter,
  lintGutter,
  lintKeymap,
} from "@codemirror/lint";
import { writable } from "svelte/store";
import {
  autocompletion,
  completeFromList,
  completionKeymap,
  ifIn,
} from "@codemirror/autocomplete";
import Handlebars from "handlebars";
import { assign, map } from "$lib/shared/utils/collection";

interface EditorState {
  hasUnsavedChanges: boolean;
  undoDepth: number;
  redoDepth: number;
  errors: LedgerFileError[];
  template: HandlebarsTemplateDelegate;
}

const initialEditorState: EditorState = {
  hasUnsavedChanges: false,
  undoDepth: 0,
  redoDepth: 0,
  errors: [],
  template: null,
};

export const editorState = writable(initialEditorState);

function lint(editor: EditorView): Diagnostic[] {
  const doc = editor.state.doc;
  try {
    Handlebars.parse(doc.toString());
    const compiled = Handlebars.compile(doc.toString(), { noEscape: true });
    editorState.update((current) =>
      assign({}, current, { template: compiled })
    );
  } catch (e) {
    const lines = e.message.split("\n");
    const match = lines[0].match(/Parse error on line (\d+):/);
    if (match != null) {
      const line = doc.line(parseInt(match[1], 10));
      return [
        {
          message: lines[3],
          severity: "error",
          from: line.from,
          to: line.to,
        },
      ];
    }
  }
  return [];
}

export function createEditor(content: string, dom: Element) {
  const autocompletions: Record<string, string[]> = {};

  editorState.set(initialEditorState);

  return new EditorView({
    extensions: [
      keymap.of([{ key: "Tab", run: insertTab }]),
      fullEditorExtensions,
      StreamLanguage.define(handlebars),
      lintGutter(),
      linter(lint),
      keymap.of(lintKeymap),
      history(),
      keymap.of(historyKeymap),
      autocompletion({
        override: map(
          autocompletions,
          (options, node) => ifIn([node], completeFromList(options)),
        ),
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
    ],
    doc: content,
    parent: dom,
  });
}

export function updateContent(editor: EditorView, content: string) {
  editor.dispatch(
    editor.state.update({
      changes: { from: 0, to: editor.state.doc.length, insert: content },
    }),
  );
}
