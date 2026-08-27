import type { Posting } from "$lib/domain/ledger";
export function helpUrl(section: string) {
  return `https://paisa.fyi/reference/${section}`;
}

export function postingUrl(posting: Posting) {
  return `/ledger/editor/${
    encodeURIComponent(posting.file_name)
  }#${posting.transaction_begin_line}`;
}

export function svgUrl(identifier: string) {
  return `url(${new URL("#" + identifier, globalThis.location.toString())})`;
}
