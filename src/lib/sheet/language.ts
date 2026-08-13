import { parser } from "./parser.js";
import { parser as searchQueryParser } from "../search/parser/parser.js";
import { LanguageSupport, LRLanguage } from "@codemirror/language";
import { parseMixed } from "@lezer/common";

export const sheetLanguage = LRLanguage.define({
  name: "sheet",
  parser: parser.configure({
    wrap: parseMixed((node) => {
      if (node.name == "SearchQuery") {
        return { parser: searchQueryParser };
      }
      return null;
    }),
    dialect: "comment",
  }),
  languageData: {
    closeBrackets: { brackets: ["[", "(", '"', "`", "{"] },
  },
});

export function sheetExtension() {
  return new LanguageSupport(sheetLanguage);
}
