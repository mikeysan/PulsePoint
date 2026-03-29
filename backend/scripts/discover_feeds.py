#!/usr/bin/env python3
"""
Discover possible RSS/Atom feeds for a given website.

What it does:
- normalises the input URL
- tries common feed paths
- fetches the homepage
- scans <link> tags for RSS/Atom feeds
- checks discovered candidates with feedparser
- prints likely valid feed URLs

Usage:
    python scripts/discover_feeds.py https://example.com
"""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from typing import Iterable
from urllib.parse import urljoin, urlparse

import feedparser
import requests


COMMON_FEED_PATHS = [
    "/feed",
    "/feed/",
    "/rss",
    "/rss/",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/index.xml",
    "/news/rss",
    "/news/feed",
]


class FeedLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link":
            return

        attr_dict = {k.lower(): (v or "") for k, v in attrs}
        rel = attr_dict.get("rel", "").lower()
        type_ = attr_dict.get("type", "").lower()
        href = attr_dict.get("href", "").strip()
        title = attr_dict.get("title", "").strip()

        if "alternate" in rel and type_ in {
            "application/rss+xml",
            "application/atom+xml",
            "application/xml",
            "text/xml",
        }:
            self.links.append(
                {
                    "href": href,
                    "type": type_,
                    "title": title,
                }
            )


def normalise_base_url(url: str) -> str:
    parsed = urlparse(url.strip())

    if not parsed.scheme:
        url = f"https://{url}"
        parsed = urlparse(url)

    if not parsed.netloc:
        raise ValueError(f"Invalid URL: {url}")

    return f"{parsed.scheme}://{parsed.netloc}"


def fetch_url(url: str, timeout: int = 10) -> requests.Response | None:
    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": "PulsePointFeedDiscovery/1.0"},
            allow_redirects=True,
        )
        response.raise_for_status()
        return response
    except requests.RequestException:
        return None


def discover_from_html(base_url: str) -> list[str]:
    response = fetch_url(base_url)
    if response is None:
        return []

    parser = FeedLinkParser()
    parser.feed(response.text)

    candidates: list[str] = []
    for link in parser.links:
        href = link.get("href", "")
        if href:
            candidates.append(urljoin(base_url, href))

    return candidates


def discover_common_paths(base_url: str) -> list[str]:
    candidates: list[str] = []

    for path in COMMON_FEED_PATHS:
        candidates.append(urljoin(base_url, path))

    return candidates


def looks_like_feed(url: str, timeout: int = 10) -> tuple[bool, str]:
    response = fetch_url(url, timeout=timeout)
    if response is None:
        return False, "request failed"

    parsed = feedparser.parse(response.content)

    if parsed.bozo and not getattr(parsed, "entries", []):
        return False, "parse failed"

    has_feed_meta = bool(getattr(parsed, "feed", {}))
    has_entries = bool(getattr(parsed, "entries", []))

    if not has_feed_meta and not has_entries:
        return False, "not a feed"

    return True, f"entries={len(getattr(parsed, 'entries', []))}"


def unique_urls(urls: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for url in urls:
        cleaned = url.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)

    return result


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/discover_feeds.py https://example.com", file=sys.stderr)
        return 2

    raw_url = sys.argv[1]

    try:
        base_url = normalise_base_url(raw_url)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    html_candidates = discover_from_html(base_url)
    path_candidates = discover_common_paths(base_url)

    candidates = unique_urls([*html_candidates, *path_candidates])

    print(f"Base URL: {base_url}")
    print(f"Candidates found: {len(candidates)}\n")

    valid_count = 0

    for candidate in candidates:
        ok, reason = looks_like_feed(candidate)
        status = "OK" if ok else "NO"

        if ok:
            valid_count += 1

        print(f"[{status}] {candidate} ({reason})")

    print(f"\nValid candidates: {valid_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())