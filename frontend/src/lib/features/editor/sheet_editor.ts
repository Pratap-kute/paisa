import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completeFromList,
  type CompletionContext,
  completionKeymap,
  type CompletionSource,
  ifIn,
} from "@codemirror/autocomplete";
import {
  history,
  historyKeymap,
  redoDepth,
  undoDepth,
} from "@codemirror/commands";
import { bracketMatching, syntaxTree } from "@codemirror/language";
import {
  type Diagnostic,
  linter,
  lintGutter,
  lintKeymap,
} from "@codemirror/lint";
import { EditorView, type KeyBinding, keymap } from "@codemirror/view";
import { initialSheetEditorState, sheetEditorState } from "$lib/state/store";
import { fullEditorExtensions } from "$lib/shared/editor/base";
import { sheetExtension, sheetLanguage } from "$lib/features/sheets/language";
import { schedulePlugin } from "$lib/domain/transaction_tag";
export { sheetEditorState } from "$lib/state/store";
import { functions } from "$lib/features/sheets/functions";

import { buildAST, Environment } from "$lib/features/sheets/interpreter";
import type { Posting } from "$lib/core/utils";
import { assign, map } from "$lib/shared/utils/collection";

let latestIdentifiers: string[] = [];

function completeIdentifier(context: CompletionContext) {
  return ifIn(["Identifier"], completeFromList(latestIdentifiers))(context);
}

const skipCommentParser = sheetLanguage.parser.configure({
  dialect: "skip_comment",
});

function lint(env: Environment) {
  latestIdentifiers = [];

  return function (editor: EditorView): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const tree = syntaxTree(editor.state);

    tree.cursor().iterate((node) => {
      if (node.type.isError) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: "error",
          message: "Invalid syntax",
        });
      }
    });

    if (diagnostics.length == 0) {
      sheetEditorState.update((current) => {
        if (!current.pendingEval) {
          return current;
        }

        const startTime = performance.now();
        let results = current.results;
        try {
          const tree = skipCommentParser.parse(editor.state.doc.toString());
          const ast = buildAST(tree.topNode, editor.state);
          diagnostics.push(...ast.validate());
          if (diagnostics.length > 0) {
            const endTime = performance.now();
            return assign({}, current, {
              pendingEval: false,
              evalDuration: endTime - startTime,
            });
          }
          const envCopy = env.clone();
          results = ast.evaluate(envCopy);
          latestIdentifiers = Object.keys(envCopy.scope);
        } catch (_e) {
          // ignore
        }
        const endTime = performance.now();

        return assign({}, current, {
          pendingEval: false,
          evalDuration: endTime - startTime,
          results,
        });
      });
    }

    return diagnostics;
  };
}

export function createEditor(
  content: string,
  dom: Element,
  postings: Posting[],
  opts: {
    keybindings?: readonly KeyBinding[];
    autocomplete?: Record<string, string[]>;
  },
) {
  const env = new Environment();
  env.scope = functions;
  env.postings = postings;

  sheetEditorState.set(initialSheetEditorState);

  let firstLoad = true;

  const autocompletions: Record<string, string[]> = {
    UnQuoted: [
      "account",
      "commodity",
      "amount",
      "date",
      "payee",
      "filename",
      "note",
      "total",
      "AND",
      "OR",
      "NOT",
    ],
  };

  const completions: Record<string, CompletionSource> = Object.fromEntries(
    Object.entries(opts.autocomplete || {}).map(([key, values]) => [
      key,
      completeFromList(values),
    ]),
  );

  return new EditorView({
    extensions: [
      keymap.of(opts.keybindings || []),
      fullEditorExtensions,
      bracketMatching(),
      closeBrackets(),
      keymap.of(closeBracketsKeymap),
      sheetExtension(),
      lintGutter(),
      linter(lint(env), {
        delay: 300,
        needsRefresh: () => {
          if (firstLoad) {
            firstLoad = false;
            return true;
          }

          return false;
        },
      }),
      keymap.of(lintKeymap),
      history(),
      keymap.of(historyKeymap),
      autocompletion({
        override: [
          completeIdentifier,
          (context: CompletionContext) => {
            for (const [key, completionSource] of Object.entries(completions)) {
              if (
                context.matchBefore(new RegExp(`${key}\\s*=[~]?\\s*[^ ]*$`))
              ) {
                return completionSource(context);
              }
            }

            return null;
          },
          ...map(
            autocompletions,
            (options, node) => ifIn([node], completeFromList(options)),
          ),
        ],
      }),
      keymap.of(completionKeymap),
      EditorView.updateListener.of((viewUpdate) => {
        const doc = viewUpdate.state.doc.toString();
        const currentLine = viewUpdate.state.doc.lineAt(
          viewUpdate.state.selection.main.head,
        );
        sheetEditorState.update((current) => {
          let pendingEval = current.pendingEval;
          if (current.doc !== doc) {
            pendingEval = true;
          }

          return assign({}, current, {
            pendingEval,
            doc,
            currentLine: currentLine.number,
            hasUnsavedChanges: current.hasUnsavedChanges ||
              viewUpdate.docChanged,
            undoDepth: undoDepth(viewUpdate.state),
            redoDepth: redoDepth(viewUpdate.state),
          });
        });
      }),
      schedulePlugin,
    ],
    doc: content,
    parent: dom,
  });
}
