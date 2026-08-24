import { defaultKeymap } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import { classHighlighter } from "@lezer/highlight";
import { search, searchKeymap } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { EditorView } from "@codemirror/view";

export const baseEditorExtensions: Extension = [
  highlightSpecialChars(),
  drawSelection(),
  dropCursor(),
  syntaxHighlighting(classHighlighter),
  EditorView.contentAttributes.of({ "data-enable-grammarly": "false" }),
  keymap.of(defaultKeymap),
];

export const fullEditorExtensions: Extension = [
  baseEditorExtensions,
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  search({ top: true }),
  keymap.of(searchKeymap),
];
