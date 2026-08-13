import { parser } from "./parser.js";
import { LanguageSupport, LRLanguage } from "@codemirror/language";

export const queryLanguage = LRLanguage.define({
  name: "query",
  parser: parser.configure({}),
  languageData: {
    closeBrackets: { brackets: ["[", "(", "/", '"'] },
  },
});

export function queryExtension() {
  return new LanguageSupport(queryLanguage);
}
