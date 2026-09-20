#!/usr/bin/env python3
"""Validate the generated MkDocs site without network-dependent checks."""

from __future__ import annotations

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE_URL = "https://pratap-kute.github.io/paisa/"
BASE_PATH = "/paisa/"
SEARCH_TERMS = (
    "import",
    "budget",
    "investment performance",
    "scenario",
    "doctor",
    "docker",
    "ledger",
    "hledger",
    "beancount",
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.anchors: set[str] = set()
        self.canonical: str | None = None
        self.in_title = False
        self.title = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if anchor := values.get("id"):
            self.anchors.add(anchor)
        if tag == "a" and values.get("name"):
            self.anchors.add(values["name"] or "")
        if tag in {"a", "link"} and values.get("href"):
            self.links.append(("href", values["href"] or ""))
        if tag in {"img", "script", "source"} and values.get("src"):
            self.links.append(("src", values["src"] or ""))
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href")
        if tag == "title":
            self.in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data


def output_path(site: Path, page: Path, target: str) -> tuple[Path, str]:
    parsed = urlsplit(target)
    path = unquote(parsed.path)
    if parsed.scheme or parsed.netloc:
        return Path(), parsed.fragment
    if path.startswith(BASE_PATH):
        candidate = site / path.removeprefix(BASE_PATH)
    elif path.startswith("/"):
        candidate = site / path.removeprefix("/")
    else:
        candidate = page.parent / path
    if not path or path.endswith("/"):
        candidate /= "index.html"
    elif candidate.suffix == "":
        candidate /= "index.html"
    return candidate.resolve(), parsed.fragment


def main() -> int:
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "site").resolve()
    errors: list[str] = []
    pages: dict[Path, PageParser] = {}
    titles: dict[str, Path] = {}

    for page in sorted(site.rglob("*.html")):
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        pages[page.resolve()] = parser
        if page.name == "404.html":
            continue
        title = " ".join(parser.title.split())
        if not title:
            errors.append(f"{page}: missing title")
        elif title in titles:
            errors.append(f"{page}: duplicate title also used by {titles[title]}: {title}")
        else:
            titles[title] = page
        if not parser.canonical or not parser.canonical.startswith(SITE_URL):
            errors.append(f"{page}: invalid canonical URL {parser.canonical!r}")

    for page, parser in pages.items():
        for attribute, target in parser.links:
            if not target or target.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
                continue
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                continue
            if target.startswith("/") and not target.startswith(BASE_PATH):
                errors.append(f"{page}: root-relative {attribute} escapes {BASE_PATH}: {target}")
                continue
            candidate, fragment = output_path(site, page, target)
            if not candidate.exists():
                errors.append(f"{page}: missing {attribute} target {target}")
                continue
            if fragment and candidate.suffix == ".html":
                target_parser = pages.get(candidate)
                if target_parser and unquote(fragment) not in target_parser.anchors:
                    errors.append(f"{page}: missing anchor in {target}: {fragment}")

    robots = (site / "robots.txt").read_text(encoding="utf-8")
    if f"Sitemap: {SITE_URL}sitemap.xml" not in robots:
        errors.append("robots.txt: incorrect sitemap URL")
    sitemap = (site / "sitemap.xml").read_text(encoding="utf-8")
    if "https://paisa.fyi" in sitemap or SITE_URL not in sitemap:
        errors.append("sitemap.xml: incorrect canonical host")

    search = json.loads((site / "search" / "search_index.json").read_text(encoding="utf-8"))
    documents = search.get("docs", [])
    searchable = " ".join(
        f"{item.get('title', '')} {item.get('text', '')} {item.get('location', '')}"
        for item in documents
    ).lower()
    for term in SEARCH_TERMS:
        if term not in searchable:
            errors.append(f"search index: no useful result text for {term!r}")
    for internal in ("showcase refresh audit", "showcase capture"):
        if internal in searchable:
            errors.append(f"search index: internal page is exposed: {internal!r}")

    if errors:
        print("Documentation validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Validated {len(pages)} pages, internal links, canonical URLs, assets, and search index.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
