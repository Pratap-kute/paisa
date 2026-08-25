import { trim } from "es-toolkit";

export function formatTextAsHtml(text?: string | null) {
  if (!text) return "";
  return `<p>${trim(text).replaceAll("\n", "<br />")}</p>`;
}
