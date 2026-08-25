import { trim } from "es-toolkit";

export function formatTextAsHtml(text: string) {
  return `<p>${trim(text).replaceAll("\n", "<br />")}</p>`;
}
